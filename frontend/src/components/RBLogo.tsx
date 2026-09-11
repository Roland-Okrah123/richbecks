import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

export default function RBLogo({ size = 44 }: { size?: number }) {
  const { logo_url } = useSettings();
  const [imgFailed, setImgFailed] = useState(false);

  if (logo_url && !imgFailed) {
    return (
      <img
        src={logo_url}
        alt="Richbecks Enterprise logo"
        onError={() => setImgFailed(true)}
        className="rounded-full object-cover border-2 border-gold shrink-0 bg-white"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center border-2 border-gold bg-charcoal-light shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="font-display font-bold text-gold" style={{ fontSize: size * 0.4 }}>
        RB
      </span>
    </div>
  );
}
