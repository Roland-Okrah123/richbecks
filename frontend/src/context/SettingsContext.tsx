import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface CompanySettings {
  company_name: string;
  tagline: string;
  phone_1: string;
  phone_2: string;
  address: string;
  currency: string;
  logo_url?: string;
  owner_whatsapp?: string;
}

const DEFAULTS: CompanySettings = {
  company_name: 'RICHBECKS Enterprise',
  tagline: 'Managing Fabrics. Growing Business.',
  phone_1: '0243262888',
  phone_2: '0202442373',
  address: 'Poly/Stu Roundabout to VRA Road, Opp. Social Welfare School Main Gate',
  currency: 'GHC',
  logo_url: undefined,
  owner_whatsapp: '',
};

const SettingsContext = createContext<CompanySettings>(DEFAULTS);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULTS);

  useEffect(() => {
    // Never let a settings read failure break the whole app — fall back to defaults.
    try {
      const unsub = onSnapshot(
        doc(db, 'settings', 'general'),
        (snap) => {
          if (snap.exists()) setSettings({ ...DEFAULTS, ...(snap.data() as Partial<CompanySettings>) });
        },
        () => setSettings(DEFAULTS)
      );
      return unsub;
    } catch {
      setSettings(DEFAULTS);
    }
  }, []);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
