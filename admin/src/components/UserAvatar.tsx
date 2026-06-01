'use client';

import { useState } from 'react';
import { resolveAvatarSrc } from '@/lib/avatar';

interface User {
  username?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface Props {
  user: User;
  /** Dimensione del cerchio in pixel. Default 36. */
  size?: number;
}

export default function UserAvatar({ user, size = 36 }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (user.username || user.email || '?').trim().charAt(0).toUpperCase();
  const src = resolveAvatarSrc(user.avatar_url);
  const dimension = { width: size, height: size };

  if (src && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setImgFailed(true)}
        style={dimension}
        className="rounded-full object-cover bg-muted shrink-0"
      />
    );
  }
  return (
    <div
      style={{ ...dimension, fontSize: Math.round(size * 0.4) }}
      className="rounded-full flex items-center justify-center text-white font-medium bg-gray-400 shrink-0"
    >
      {initial}
    </div>
  );
}
