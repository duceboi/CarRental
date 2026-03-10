// IPFS/Pinata has been replaced by Cloudinary.
// See src/lib/cloudinary.js for the current image upload implementation.
// This file is kept to avoid breaking any stale imports during the transition.

/**
 * Uploads a single File to Pinata IPFS.
 * Strategy:
 *   1. v3 Files API with JWT (new Pinata accounts)
 *   2. v1 legacy API with API Key + Secret headers (bypasses scope restrictions)
 *   3. v1 legacy API with JWT bearer (older accounts with pinFileToIPFS scope)
 */
export async function uploadImageToIPFS(file) {
  if (!PINATA_JWT && !PINATA_API_KEY) {
    throw new Error(
      "Pinata credentials not configured. Add VITE_PINATA_JWT to frontend/.env",
    );
  }

  // --- Strategy 1: Pinata v3 Files API (new accounts) ---
  if (PINATA_JWT) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", `car-rental-${file.name}-${Date.now()}`);

    const v3Res = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: formData,
    });

    if (v3Res.ok) {
      const { data } = await v3Res.json();
      return data.cid;
    }
  }

  // --- Strategy 2: v1 API with API Key + Secret (no scope restriction) ---
  if (PINATA_API_KEY && PINATA_API_SECRET) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "pinataMetadata",
      JSON.stringify({ name: `car-rental-${file.name}-${Date.now()}` }),
    );
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      return data.IpfsHash;
    }

    const errText = await res.text();
    throw new Error(`Pinata upload failed (${res.status}): ${errText}`);
  }

  // --- Strategy 3: v1 API with JWT bearer (older scoped keys) ---
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: `car-rental-${file.name}-${Date.now()}` }),
  );
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (res.ok) {
    const data = await res.json();
    return data.IpfsHash;
  }

  const errText = await res.text();
  throw new Error(`Pinata upload failed (${res.status}): ${errText}`);
}

/**
 * Uploads multiple File objects to IPFS in parallel.
 * Returns array of CIDs in the same order as the input files.
 */
export async function uploadImagesToIPFS(files) {
  return Promise.all(files.map((f) => uploadImageToIPFS(f)));
}
