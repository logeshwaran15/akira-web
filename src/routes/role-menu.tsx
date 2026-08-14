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
import { Save, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/role-menu")({
  head: () => ({
    meta: [
      { title: "Role Menu Assign — Akira School ERP" },
      { name: "description", content: "Assign menus and action permissions to roles." },
    ],
  }),
  component: RoleMenuPage,
});

type Role = { akiraRoleKey: string; roleCode: string; roleName: string };

type PermissionKey = "canView" | "canAdd" | "canEdit" | "canDelete" | "canExport" | "canPrint";

type MatrixItem = {
  akiraMenuKey: string;
  menuName: string;
  menuCode: string;
  parentMenuKey: string | null;
  parentMenuName: string | null;
  sortOrder: number;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canPrint: boolean;
};

const PERMISSION_COLUMNS: { key: PermissionKey; label: string }[] = [
  { key: "canView", label: "View" },
  { key: "canAdd", label: "Add" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
  { key: "canExport", label: "Export" },
  { key: "canPrint", label: "Print" },
];

function RoleMenuPage() {
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
    apiFetch(`/api/RoleMenu/${roleKey}`)
      .then((data: MatrixItem[]) => setMatrix(data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load permissions"))
      .finally(() => setLoading(false));
  }, [roleKey]);

  const toggle = (menuKey: string, key: PermissionKey) => {
    setMatrix((rows) =>
      rows.map((row) => {
        if (row.akiraMenuKey !== menuKey) return row;
        const next = { ...row, [key]: !row[key] };
        // Checking any action implies View; unchecking View clears every action.
        if (key !== "canView" && next[key]) next.canView = true;
        if (key === "canView" && !next.canView) {
          next.canAdd = next.canEdit = next.canDelete = next.canExport = next.canPrint = false;
        }
        return next;
      }),
    );
  };

  const toggleRowAll = (menuKey: string, checked: boolean) => {
    setMatrix((rows) =>
      rows.map((row) =>
        row.akiraMenuKey === menuKey
          ? { ...row, canView: checked, canAdd: checked, canEdit: checked, canDelete: checked, canExport: checked, canPrint: checked }
          : row,
      ),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/RoleMenu/assign", {
        method: "POST",
        body: JSON.stringify({
          akiraRoleKey: roleKey,
          items: matrix.map((r) => ({
            akiraMenuKey: r.akiraMenuKey,
            canView: r.canView,
            canAdd: r.canAdd,
            canEdit: r.canEdit,
            canDelete: r.canDelete,
            canExport: r.canExport,
            canPrint: r.canPrint,
          })),
        }),
      });
      toast.success("Permissions saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const sections = Array.from(new Set(matrix.map((m) => m.parentMenuName ?? "Other")));

  return (
    <div>
      <PageHeader
        title="Role Menu Assign"
        breadcrumbs={[{ label: "System" }, { label: "Role Menu Assign" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={save} disabled={saving || loading || !roleKey}>
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Permissions"}
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3 rounded-md border border-border bg-card p-3 shadow-sm">
        <ShieldCheck className="h-4 w-4 text-primary" />
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
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Menu</TableHead>
                {PERMISSION_COLUMNS.map((c) => (
                  <TableHead key={c.key} className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {c.label}
                  </TableHead>
                ))}
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">All</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={PERMISSION_COLUMNS.length + 2} className="h-32 text-center text-sm text-muted-foreground">
                    Loading permissions...
                  </TableCell>
                </TableRow>
              ) : matrix.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={PERMISSION_COLUMNS.length + 2} className="h-32 text-center text-sm text-muted-foreground">
                    No menu items found.
                  </TableCell>
                </TableRow>
              ) : (
                sections.map((section) => (
                  <Fragment key={section}>
                    <TableRow className="border-border bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={PERMISSION_COLUMNS.length + 2} className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Badge variant="outline" className="rounded-md">{section}</Badge>
                      </TableCell>
                    </TableRow>
                    {matrix
                      .filter((m) => (m.parentMenuName ?? "Other") === section)
                      .map((row) => {
                        const allChecked = PERMISSION_COLUMNS.every((c) => row[c.key]);
                        return (
                          <TableRow key={row.akiraMenuKey} className="border-border">
                            <TableCell className="text-sm font-medium">{row.menuName}</TableCell>
                            {PERMISSION_COLUMNS.map((c) => (
                              <TableCell key={c.key} className="text-center">
                                <Checkbox
                                  checked={row[c.key]}
                                  onCheckedChange={() => toggle(row.akiraMenuKey, c.key)}
                                />
                              </TableCell>
                            ))}
                            <TableCell className="text-center">
                              <Checkbox
                                checked={allChecked}
                                onCheckedChange={(v) => toggleRowAll(row.akiraMenuKey, !!v)}
                                className={cn(allChecked && "border-primary")}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
