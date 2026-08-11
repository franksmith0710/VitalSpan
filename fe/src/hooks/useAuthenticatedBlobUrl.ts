import { useEffect, useState } from "react";
import { fetchAuthenticatedBlob } from "@/lib/apiUpload";

export function useAuthenticatedBlobUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!path) {
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    void fetchAuthenticatedBlob(path)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return url;
}
