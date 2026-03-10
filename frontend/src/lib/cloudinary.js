const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads a single File to Cloudinary using an unsigned upload preset.
 * Returns the secure_url of the uploaded image.
 *
 * Setup:
 *  1. Create a free Cloudinary account at https://cloudinary.com
 *  2. Copy your Cloud Name from the dashboard home page
 *  3. Go to Settings → Upload presets → Add an unsigned preset
 *  4. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env
 */
export async function uploadImageToCloudinary(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to frontend/.env",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "car-rental");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.secure_url;
}

/**
 * Uploads multiple File objects to Cloudinary in parallel.
 * Returns an array of secure_url strings in the same order as the input files.
 */
export async function uploadImagesToCloudinary(files) {
  return Promise.all(files.map((f) => uploadImageToCloudinary(f)));
}
