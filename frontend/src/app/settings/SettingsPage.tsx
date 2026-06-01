// frontend/src/app/settings/SettingsPage.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Settings,
  School,
  Phone,
  Mail,
  MapPin,
  Quote,
  Save,
  Loader2,
  CheckCircle,
  Upload,
  Image,
  Building2,
} from "lucide-react";

type SchoolSettings = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  motto: string;
  logoUrl: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SchoolSettings>({
    id: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    motto: "",
    logoUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/api/settings");
      setSettings(data.data || {});
    } catch (e) {
      console.error("Failed to load settings", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put("/api/settings", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save settings", e);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Convert uploaded image to base64 and store as logoUrl
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setSettings((s) => ({ ...s, logoUrl: reader.result as string }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              School Settings
            </h1>
            <p className="text-sm text-slate-500">
              Configure school identity — used on reports and emails
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 font-semibold text-white h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200/50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Logo Card */}
        <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Image className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-800">
                School Logo
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center gap-4">
            {/* Logo Preview */}
            <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="School logo"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Building2 className="w-10 h-10" />
                  <span className="text-xs">No logo</span>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />

            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center gap-2 rounded-xl border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? "Processing..." : "Upload Logo"}
            </Button>

            {settings.logoUrl && (
              <Button
                variant="outline"
                onClick={() => setSettings((s) => ({ ...s, logoUrl: "" }))}
                className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50"
              >
                Remove Logo
              </Button>
            )}

            <p className="text-xs text-slate-400 text-center">
              PNG, JPG up to 2MB. Will appear on reports and emails.
            </p>
          </CardContent>
        </Card>

        {/* School Info Card */}
        <Card className="lg:col-span-2 border-none shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <School className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-800">
                School Information
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 grid gap-5 md:grid-cols-2">
            {/* School Name */}
            <div className="md:col-span-2">
              <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                <School className="w-4 h-4 text-indigo-600" />
                School Name
              </Label>
              <Input
                value={settings.name}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="e.g. Saint Pillas School"
                className="h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-200"
              />
            </div>

            {/* Phone */}
            <div>
              <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                <Phone className="w-4 h-4 text-indigo-600" />
                Phone Number
              </Label>
              <Input
                value={settings.phone}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, phone: e.target.value }))
                }
                placeholder="e.g. +265 999 000 000"
                className="h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-200"
              />
            </div>

            {/* Email */}
            <div>
              <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                <Mail className="w-4 h-4 text-indigo-600" />
                School Email
              </Label>
              <Input
                value={settings.email}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, email: e.target.value }))
                }
                placeholder="e.g. info@school.ac.mw"
                className="h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-200"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Address
              </Label>
              <Input
                value={settings.address}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, address: e.target.value }))
                }
                placeholder="e.g. P.O. Box 123, Blantyre, Malawi"
                className="h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-200"
              />
            </div>

            {/* Motto */}
            <div className="md:col-span-2">
              <Label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                <Quote className="w-4 h-4 text-indigo-600" />
                School Motto
              </Label>
              <Input
                value={settings.motto}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, motto: e.target.value }))
                }
                placeholder="e.g. Excellence Through Knowledge"
                className="h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-200"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Card */}
      {(settings.name || settings.logoUrl) && (
        <Card className="border-none shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
            <CardTitle className="text-base font-semibold text-slate-800">
              Report Header Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="border border-slate-200 rounded-xl p-6 bg-white max-w-2xl mx-auto">
              <div className="flex items-center gap-4 pb-4 border-b-2 border-indigo-600">
                {settings.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt="logo"
                    className="w-16 h-16 object-contain"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {settings.name || "School Name"}
                  </h2>
                  {settings.address && (
                    <p className="text-sm text-slate-500">{settings.address}</p>
                  )}
                  {settings.motto && (
                    <p className="text-xs italic text-indigo-600 mt-1">
                      "{settings.motto}"
                    </p>
                  )}
                </div>
              </div>
              <p className="text-center text-slate-500 text-sm mt-3">
                School Fees Report — Preview
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
