import React, { useState } from 'react';
import { CheckCircle2, Phone, ShieldCheck } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Avatar, Button, Card, DescriptionRow, Input, SectionHeading } from '../components/ui/Primitives';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';

export const ProfilePage = () => {
  const { user } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppLayout>
      <SectionHeading title="My Profile" description="Court-issued identity and access details for this account." />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <div className="flex flex-col items-center text-center">
            <Avatar initials={initials(user.name)} size={72} />
            <h2 className="text-base font-semibold text-navy-900 mt-4">{user.name}</h2>
            <p className="text-xs text-ink-500 mt-1">{user.designation}</p>
            <div className="mt-4 w-full pt-4 border-t border-line-200 flex items-center justify-center gap-2 text-xs text-ashoka-700">
              <ShieldCheck size={14} /> MFA Enabled
            </div>
          </div>
        </Card>

        <Card title="Judicial / Bar Identity" className="lg:col-span-2">
          <dl>
            <DescriptionRow label="Full Name" value={user.name} />
            <DescriptionRow label="Designation" value={user.designation} />
            <DescriptionRow label="Bar / Judicial ID" value={user.barOrJudicialId} />
            <DescriptionRow label="Court" value={user.court} />
            <DescriptionRow label="Jurisdiction" value={user.jurisdiction} />
            <DescriptionRow label="Registered Email" value={user.email} />
          </dl>
        </Card>

        <Card title="Contact Details" className="lg:col-span-3">
          <form onSubmit={handleSave} className="grid sm:grid-cols-2 gap-5 max-w-xl">
            <Input label="Registered Email" value={user.email} disabled />
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <Button type="submit" variant="primary">
                <Phone size={14} /> Save Contact Details
              </Button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-ashoka-700">
                  <CheckCircle2 size={15} /> Saved
                </span>
              )}
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
};
