/**
 * Hired Cast Store — global persistent storage for saved cast members.
 * Separate from the main workflow store so hired cast persists across all projects.
 *
 * Images are eagerly uploaded to HTTP URLs (via imgbb) so they are always
 * ready for use in API calls without needing base64 → HTTP conversion at
 * generation time.
 */
import { create } from "zustand";
import type { HiredCast } from "@/types/schema";
import { uploadImage } from "@/lib/api";

const STORAGE_KEY = "openframe-hired-cast";

function loadHiredCast(): HiredCast[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHiredCast(cast: HiredCast[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cast));
  } catch {
    // Storage full — silently fail
  }
}

/**
 * Upload a base64 data URL to get a public HTTP URL.
 * Returns the original URL if it's already HTTP or upload fails.
 */
async function ensureHttpUrl(url: string): Promise<string> {
  if (url.startsWith("http")) return url;
  if (!url.startsWith("data:image")) return url;
  try {
    return await uploadImage(url);
  } catch (e) {
    console.warn("[HiredCast] Failed to upload image to HTTP URL:", e);
    return url; // keep base64 as fallback
  }
}

interface HiredCastStore {
  hiredCast: HiredCast[];
  addHiredCast: (cast?: Partial<HiredCast>) => HiredCast;
  updateHiredCast: (id: string, updates: Partial<HiredCast>) => void;
  removeHiredCast: (id: string) => void;
  addImageToHiredCast: (id: string, imageUrl: string) => void;
  removeImageFromHiredCast: (id: string, imageIndex: number) => void;
  migrateBase64Images: () => void;
}

export const useHiredCastStore = create<HiredCastStore>((set, get) => ({
  hiredCast: loadHiredCast(),

  addHiredCast: (partial) => {
    const now = Date.now();
    const newCast: HiredCast = {
      id: `hcast-${now}`,
      name: partial?.name || "New Cast Member",
      driver_type: partial?.driver_type || "human",
      description: partial?.description || "",
      images: partial?.images || [],
      gender: partial?.gender,
      age_range: partial?.age_range,
      ethnicity: partial?.ethnicity,
      physical_details: partial?.physical_details,
      notes: partial?.notes,
      created_at: now,
      updated_at: now,
    };
    set((s) => {
      const updated = [...s.hiredCast, newCast];
      saveHiredCast(updated);
      return { hiredCast: updated };
    });
    return newCast;
  },

  updateHiredCast: (id, updates) => {
    set((s) => {
      const updated = s.hiredCast.map((c) =>
        c.id === id ? { ...c, ...updates, updated_at: Date.now() } : c
      );
      saveHiredCast(updated);
      return { hiredCast: updated };
    });
  },

  removeHiredCast: (id) => {
    set((s) => {
      const updated = s.hiredCast.filter((c) => c.id !== id);
      saveHiredCast(updated);
      return { hiredCast: updated };
    });
  },

  addImageToHiredCast: (id, imageUrl) => {
    // Immediately add the image (may be base64 initially)
    set((s) => {
      const updated = s.hiredCast.map((c) => {
        if (c.id !== id) return c;
        if (c.images.length >= 20) return c; // Max 20 images
        return { ...c, images: [...c.images, imageUrl], updated_at: Date.now() };
      });
      saveHiredCast(updated);
      return { hiredCast: updated };
    });

    // If it's base64, upload asynchronously and replace with HTTP URL
    if (imageUrl.startsWith("data:image")) {
      ensureHttpUrl(imageUrl).then((httpUrl) => {
        if (httpUrl === imageUrl) return; // upload failed, keep base64
        set((s) => {
          const updated = s.hiredCast.map((c) => {
            if (c.id !== id) return c;
            // Replace the exact base64 URL with the HTTP URL
            return {
              ...c,
              images: c.images.map((u) => u === imageUrl ? httpUrl : u),
              updated_at: Date.now(),
            };
          });
          saveHiredCast(updated);
          return { hiredCast: updated };
        });
        console.info(`[HiredCast] Uploaded image → ${httpUrl}`);
      });
    }
  },

  removeImageFromHiredCast: (id, imageIndex) => {
    set((s) => {
      const updated = s.hiredCast.map((c) => {
        if (c.id !== id) return c;
        return { ...c, images: c.images.filter((_, i) => i !== imageIndex), updated_at: Date.now() };
      });
      saveHiredCast(updated);
      return { hiredCast: updated };
    });
  },

  // Migrate any existing base64 images to HTTP URLs (runs once on app init)
  migrateBase64Images: () => {
    const castList = get().hiredCast;
    for (const cast of castList) {
      for (let i = 0; i < cast.images.length; i++) {
        const img = cast.images[i];
        if (img.startsWith("data:image")) {
          ensureHttpUrl(img).then((httpUrl) => {
            if (httpUrl === img) return;
            set((s) => {
              const updated = s.hiredCast.map((c) => {
                if (c.id !== cast.id) return c;
                return {
                  ...c,
                  images: c.images.map((u) => u === img ? httpUrl : u),
                  updated_at: Date.now(),
                };
              });
              saveHiredCast(updated);
              return { hiredCast: updated };
            });
            console.info(`[HiredCast] Migrated base64 image → ${httpUrl}`);
          });
        }
      }
    }
  },
}));

// Auto-migrate base64 images on first load
if (typeof window !== "undefined") {
  // Delay to ensure API is ready
  setTimeout(() => useHiredCastStore.getState().migrateBase64Images(), 2000);
}
