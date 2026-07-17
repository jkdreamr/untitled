/** PUT a file to a signed URL with upload-progress callbacks. */
export function putWithProgress(
  url: string,
  file: Blob,
  onProgress: (ratio: number) => void,
  headers: Record<string, string> = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("network error during upload"));
    xhr.onabort = () => reject(new Error("upload cancelled"));
    xhr.send(file);
  });
}
