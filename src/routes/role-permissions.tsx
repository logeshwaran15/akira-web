import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Save, KeyRound } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/role-permissions")({
  head: () => ({
    meta: [
      { title: "Role Permission Assign — Akira School ERP" },
      { name: "description", content: "Assign fine-grained Module.Feature.Action permissions to roles." },
    ],
  }),
  component: RolePermissionsPage,
});

type Role = { akiraRoleKey: string; roleCode: string; roleName: string };

type MatrixItem = {
  akiraPermissionKey: string;
  permissionCode: string;
  module: string;
  feature: string;
  action: string;
  isGranted: boolean;
};

function RolePermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleKey, setRoleKey] = useState<string>("");
  const [matrix, setMatrix] = useState<MatrixItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/Role")
      .then((data: Role[]) => {
        setRoles(data);
        if (data.length > 0) setRoleKey(data[0].akiraRoleKey);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load roles"));
  }, []);

  useEffect(() => {
    if (!roleKey) return;
    setLoading(true);
    apiFetch(`/api/RolePermission/${roleKey}`)
      .then((data: MatrixItem[]) => setMatrix(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load permissions"))
      .finally(() => setLoading(false));
  }, [roleKey]);

  const toggle = (key: string) => {
    setMatrix((rows) => rows.map((r) => r.akiraPermissionKey === key ? { ...r, isGranted: !r.isGranted } : r));
  };

  const toggleFeature = (module: string, feature: string, checked: boolean) => {
    setMatrix((rows) =>
      rows.map((r) => (r.module === module && r.feature === feature) ? { ...r, isGranted: checked } : r),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/RolePermission/assign", {
        method: "POST",
        body: JSON.stringify({
          akiraRoleKey: roleKey,
          grantedPermissionKeys: matrix.filter((m) => m.isGranted).map((m) => m.akiraPermissionKey),
        }),
      });
      toast.success("Permissions saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const modules = Array.from(new Set(matrix.map((m) => m.module)));

  return (
    <div>
      <PageHeader
        title="Role Permission Assign"
        breadcrumbs={[{ label: "System" }, { label: "Role Permission Assign" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={save} disabled={saving || loading || !roleKey}>
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Permissions"}
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3 rounded-md border border-border bg-card p-3 shadow-sm">
        <KeyRound className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Role</Label>
        <Select value={roleKey} onValueChange={setRoleKey}>
          <SelectTrigger className="h-9 w-[260px] rounded-md"><SelectValue placeholder="Select role" /></SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.akiraRoleKey} value={r.akiraRoleKey}>{r.roleName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feature</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-32 text-center text-sm text-muted-foreground">
                    Loading permissions...
                  </TableCell>
                </TableRow>
              ) : matrix.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-32 text-center text-sm text-muted-foreground">
                    No permissions found.
                  </TableCell>
                </TableRow>
              ) : (
                modules.map((module) => {
                  const features = Array.from(new Set(matrix.filter((m) => m.module === module).map((m) => m.feature)));
                  return (
                    <Fragment key={module}>
                      <TableRow className="border-border bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={2} className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Badge variant="outline" className="rounded-md">{module}</Badge>
                        </TableCell>
                      </TableRow>
                      {features.map((feature) => {
                        const items = matrix.filter((m) => m.module === module && m.feature === feature);
                        const allChecked = items.every((i) => i.isGranted);
                        return (
                          <TableRow key={feature} className="border-border">
                            <TableCell className="align-top text-sm font-medium">
                              <label className="flex items-center gap-2">
                                <Checkbox checked={allChecked} onCheckedChange={(v) => toggleFeature(module, feature, !!v)} />
                                {feature}
                              </label>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-4">
                                {items.map((item) => (
                                  <label key={item.akiraPermissionKey} className="flex items-center gap-1.5 text-sm">
                                    <Checkbox checked={item.isGranted} onCheckedChange={() => toggle(item.akiraPermissionKey)} />
                                    {item.action}
                                  </label>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
