import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/erp/PageHeader";
import { FormDialog } from "@/components/erp/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Building2, DoorOpen, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campus-setup")({
  head: () => ({
    meta: [
      { title: "Campus & Rooms — Akira School ERP" },
      { name: "description", content: "Manage campuses, buildings, floors and rooms." },
    ],
  }),
  component: CampusSetupPage,
});

type Campus = { campusKey: string; campusName: string; address: string | null; contactNumber: string | null; inChargeUserKey: string | null; inChargeName: string | null; isActive: boolean };
type Building = { buildingKey: string; campusKey: string; buildingName: string; numberOfFloors: number; constructionYear: number | null; isActive: boolean };
type Floor = { floorKey: string; buildingKey: string; floorName: string; floorNumber: number };
type UserOption = { akiraUserKey: string; userName: string };
type Room = {
  roomKey: string; buildingKey: string; floorKey: string; floorName: string; roomName: string; roomType: string;
  seatingCapacity: number; hasProjector: boolean; hasSmartboard: boolean; hasAC: boolean; hasLabEquipment: boolean;
  isExamHallEligible: boolean; isActive: boolean;
};

const ROOM_TYPES = ["CLASSROOM", "SCIENCE_LAB", "COMPUTER_LAB", "LANGUAGE_LAB", "LIBRARY", "AUDITORIUM", "STAFF_ROOM", "SPORTS_GROUND", "MUSIC_ROOM", "ART_ROOM", "CONFERENCE_ROOM"];

const emptyRoom = { roomName: "", roomType: "CLASSROOM", seatingCapacity: 40, floorKey: "", hasProjector: false, hasSmartboard: false, hasAC: false, hasLabEquipment: false, isExamHallEligible: false };

function CampusSetupPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [campusOpen, setCampusOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [campusDraft, setCampusDraft] = useState({ campusName: "", address: "", contactNumber: "", inChargeUserKey: "" });
  const [savingCampus, setSavingCampus] = useState(false);
  const [deleteCampusTarget, setDeleteCampusTarget] = useState<Campus | null>(null);

  const [buildingsFor, setBuildingsFor] = useState<Campus | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [buildingOpen, setBuildingOpen] = useState(false);
  const [buildingDraft, setBuildingDraft] = useState({ buildingName: "", numberOfFloors: 1, constructionYear: "" });
  const [savingBuilding, setSavingBuilding] = useState(false);
  const [deleteBuildingTarget, setDeleteBuildingTarget] = useState<Building | null>(null);

  const [roomsFor, setRoomsFor] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomDraft, setRoomDraft] = useState(emptyRoom);
  const [savingRoom, setSavingRoom] = useState(false);
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<Room | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([apiFetch("/api/Campus"), apiFetch("/api/User")])
      .then(([c, u]) => { setCampuses(c); setUsers(u); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load campuses"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNewCampus = () => { setEditingCampus(null); setCampusDraft({ campusName: "", address: "", contactNumber: "", inChargeUserKey: "" }); setCampusOpen(true); };
  const openEditCampus = (c: Campus) => {
    setEditingCampus(c);
    setCampusDraft({ campusName: c.campusName, address: c.address ?? "", contactNumber: c.contactNumber ?? "", inChargeUserKey: c.inChargeUserKey ?? "" });
    setCampusOpen(true);
  };

  const saveCampus = async () => {
    setSavingCampus(true);
    try {
      const body = {
        campusName: campusDraft.campusName,
        address: campusDraft.address || null,
        contactNumber: campusDraft.contactNumber || null,
        inChargeUserKey: campusDraft.inChargeUserKey || null,
      };
      if (editingCampus) {
        await apiFetch(`/api/Campus/${editingCampus.campusKey}`, { method: "PUT", body: JSON.stringify({ campusKey: editingCampus.campusKey, ...body, isActive: editingCampus.isActive }) });
        toast.success("Campus updated");
      } else {
        await apiFetch("/api/Campus", { method: "POST", body: JSON.stringify(body) });
        toast.success("Campus created");
      }
      setCampusOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save campus");
    } finally {
      setSavingCampus(false);
    }
  };

  const confirmDeleteCampus = async () => {
    if (!deleteCampusTarget) return;
    try {
      await apiFetch(`/api/Campus/${deleteCampusTarget.campusKey}`, { method: "DELETE" });
      toast.success("Campus removed");
      setDeleteCampusTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove campus");
    }
  };

  const openBuildings = (c: Campus) => {
    setBuildingsFor(c);
    setBuildingsLoading(true);
    apiFetch(`/api/Building?campusId=${c.campusKey}`)
      .then((d: Building[]) => setBuildings(d))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load buildings"))
      .finally(() => setBuildingsLoading(false));
  };

  const saveBuilding = async () => {
    if (!buildingsFor) return;
    setSavingBuilding(true);
    try {
      await apiFetch("/api/Building", {
        method: "POST",
        body: JSON.stringify({
          campusKey: buildingsFor.campusKey,
          buildingName: buildingDraft.buildingName,
          numberOfFloors: buildingDraft.numberOfFloors,
          constructionYear: buildingDraft.constructionYear ? Number(buildingDraft.constructionYear) : null,
        }),
      });
      toast.success("Building added");
      setBuildingOpen(false);
      setBuildingDraft({ buildingName: "", numberOfFloors: 1, constructionYear: "" });
      openBuildings(buildingsFor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add building");
    } finally {
      setSavingBuilding(false);
    }
  };

  const confirmDeleteBuilding = async () => {
    if (!deleteBuildingTarget || !buildingsFor) return;
    try {
      await apiFetch(`/api/Building/${deleteBuildingTarget.buildingKey}`, { method: "DELETE" });
      toast.success("Building removed");
      setDeleteBuildingTarget(null);
      openBuildings(buildingsFor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove building");
    }
  };

  const openRooms = (b: Building) => {
    setRoomsFor(b);
    setRoomsLoading(true);
    Promise.all([
      apiFetch(`/api/Building/${b.buildingKey}/floors`),
      apiFetch(`/api/Room?buildingId=${b.buildingKey}`),
    ])
      .then(([f, r]) => { setFloors(f); setRooms(r); })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load rooms"))
      .finally(() => setRoomsLoading(false));
  };

  const openNewRoom = () => {
    setEditingRoom(null);
    setRoomDraft({ ...emptyRoom, floorKey: floors[0]?.floorKey ?? "" });
    setRoomOpen(true);
  };

  const openEditRoom = (r: Room) => {
    setEditingRoom(r);
    setRoomDraft({
      roomName: r.roomName, roomType: r.roomType, seatingCapacity: r.seatingCapacity, floorKey: r.floorKey,
      hasProjector: r.hasProjector, hasSmartboard: r.hasSmartboard, hasAC: r.hasAC, hasLabEquipment: r.hasLabEquipment,
      isExamHallEligible: r.isExamHallEligible,
    });
    setRoomOpen(true);
  };

  const saveRoom = async () => {
    if (!roomsFor) return;
    setSavingRoom(true);
    try {
      if (editingRoom) {
        await apiFetch(`/api/Room/${editingRoom.roomKey}`, {
          method: "PUT",
          body: JSON.stringify({ roomKey: editingRoom.roomKey, ...roomDraft, isActive: editingRoom.isActive }),
        });
        toast.success("Room updated");
      } else {
        await apiFetch("/api/Room", { method: "POST", body: JSON.stringify({ buildingKey: roomsFor.buildingKey, ...roomDraft }) });
        toast.success("Room created");
      }
      setRoomOpen(false);
      openRooms(roomsFor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save room");
    } finally {
      setSavingRoom(false);
    }
  };

  const confirmDeleteRoom = async () => {
    if (!deleteRoomTarget || !roomsFor) return;
    try {
      await apiFetch(`/api/Room/${deleteRoomTarget.roomKey}`, { method: "DELETE" });
      toast.success("Room removed");
      setDeleteRoomTarget(null);
      openRooms(roomsFor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove room");
    }
  };

  return (
    <div>
      <PageHeader
        title="Campus & Rooms"
        breadcrumbs={[{ label: "School Setup" }, { label: "Campus & Rooms" }]}
        actions={
          <Button className="h-10 gap-1.5 rounded-md shadow-sm" onClick={openNewCampus}>
            <Plus className="h-4 w-4" /> New Campus
          </Button>
        }
      />

      <div className="rounded-md border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campus</TableHead>
              <TableHead>In-Charge</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
            ) : campuses.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">No campuses yet.</TableCell></TableRow>
            ) : (
              campuses.map((c) => (
                <TableRow key={c.campusKey}>
                  <TableCell>
                    <div className="font-medium">{c.campusName}</div>
                    {c.address && <div className="text-xs text-muted-foreground">{c.address}</div>}
                  </TableCell>
                  <TableCell>{c.inChargeName ?? "—"}</TableCell>
                  <TableCell>{c.contactNumber ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-md" onClick={() => openBuildings(c)}>
                        <Building2 className="h-3.5 w-3.5" /> Buildings
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEditCampus(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteCampusTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Campus create/edit */}
      <FormDialog open={campusOpen} onOpenChange={setCampusOpen} title={editingCampus ? "Edit Campus" : "New Campus"} submitLabel={editingCampus ? "Save Changes" : "Create Campus"} onSubmit={saveCampus} submitting={savingCampus} size="md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Campus Name</Label>
            <Input value={campusDraft.campusName} onChange={(e) => setCampusDraft({ ...campusDraft, campusName: e.target.value })} className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={campusDraft.address} onChange={(e) => setCampusDraft({ ...campusDraft, address: e.target.value })} className="rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contact Number</Label>
              <Input value={campusDraft.contactNumber} onChange={(e) => setCampusDraft({ ...campusDraft, contactNumber: e.target.value })} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label>In-Charge</Label>
              <Select value={campusDraft.inChargeUserKey || "none"} onValueChange={(v) => setCampusDraft({ ...campusDraft, inChargeUserKey: v === "none" ? "" : v })}>
                <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose staff" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u) => <SelectItem key={u.akiraUserKey} value={u.akiraUserKey}>{u.userName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Buildings dialog */}
      <FormDialog open={!!buildingsFor} onOpenChange={(v) => !v && setBuildingsFor(null)} title={`Buildings — ${buildingsFor?.campusName ?? ""}`} submitLabel="Close" cancelLabel="Close" onSubmit={() => setBuildingsFor(null)} size="lg">
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={() => setBuildingOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New Building
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Building</TableHead>
                <TableHead>Floors</TableHead>
                <TableHead>Built</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildingsLoading ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
              ) : buildings.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">No buildings yet.</TableCell></TableRow>
              ) : (
                buildings.map((b) => (
                  <TableRow key={b.buildingKey}>
                    <TableCell className="font-medium">{b.buildingName}</TableCell>
                    <TableCell>{b.numberOfFloors}</TableCell>
                    <TableCell>{b.constructionYear ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-md" onClick={() => openRooms(b)}>
                          <DoorOpen className="h-3.5 w-3.5" /> Rooms
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteBuildingTarget(b)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </FormDialog>

      {/* New building dialog */}
      <FormDialog open={buildingOpen} onOpenChange={setBuildingOpen} title="New Building" submitLabel="Create" onSubmit={saveBuilding} submitting={savingBuilding} size="sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Building Name</Label>
            <Input value={buildingDraft.buildingName} onChange={(e) => setBuildingDraft({ ...buildingDraft, buildingName: e.target.value })} placeholder="Block A" className="rounded-md" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label required>Number of Floors</Label>
              <Input type="number" min={1} value={buildingDraft.numberOfFloors} onChange={(e) => setBuildingDraft({ ...buildingDraft, numberOfFloors: Number(e.target.value) })} className="rounded-md" required />
            </div>
            <div className="space-y-1.5">
              <Label>Construction Year</Label>
              <Input type="number" value={buildingDraft.constructionYear} onChange={(e) => setBuildingDraft({ ...buildingDraft, constructionYear: e.target.value })} className="rounded-md" />
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Rooms dialog */}
      <FormDialog open={!!roomsFor} onOpenChange={(v) => !v && setRoomsFor(null)} title={`Rooms — ${roomsFor?.buildingName ?? ""}`} submitLabel="Close" cancelLabel="Close" onSubmit={() => setRoomsFor(null)} size="xl">
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="h-9 gap-1.5 rounded-md" onClick={openNewRoom} disabled={floors.length === 0}>
              <Plus className="h-3.5 w-3.5" /> New Room
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomsLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">Loading...</TableCell></TableRow>
              ) : rooms.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">No rooms yet.</TableCell></TableRow>
              ) : (
                rooms.map((r) => (
                  <TableRow key={r.roomKey}>
                    <TableCell className="font-medium">
                      {r.roomName}
                      {r.isExamHallEligible && <Badge variant="outline" className="ml-2 rounded-md text-[10px]">Exam Hall</Badge>}
                    </TableCell>
                    <TableCell>{r.floorName}</TableCell>
                    <TableCell><Badge variant="outline" className="rounded-md">{r.roomType}</Badge></TableCell>
                    <TableCell>{r.seatingCapacity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[r.hasProjector && "Projector", r.hasSmartboard && "Smartboard", r.hasAC && "AC", r.hasLabEquipment && "Lab Equip"].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => openEditRoom(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => setDeleteRoomTarget(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </FormDialog>

      {/* Room create/edit */}
      <FormDialog open={roomOpen} onOpenChange={setRoomOpen} title={editingRoom ? "Edit Room" : "New Room"} submitLabel={editingRoom ? "Save Changes" : "Create Room"} onSubmit={saveRoom} submitting={savingRoom} size="lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label required>Room Name</Label>
            <Input value={roomDraft.roomName} onChange={(e) => setRoomDraft({ ...roomDraft, roomName: e.target.value })} placeholder="Room 101" className="rounded-md" required />
          </div>
          <div className="space-y-1.5">
            <Label required>Room Type</Label>
            <Select value={roomDraft.roomType} onValueChange={(v) => setRoomDraft({ ...roomDraft, roomType: v })}>
              <SelectTrigger className="rounded-md"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Floor</Label>
            <Select value={roomDraft.floorKey} onValueChange={(v) => setRoomDraft({ ...roomDraft, floorKey: v })}>
              <SelectTrigger className="rounded-md"><SelectValue placeholder="Choose floor" /></SelectTrigger>
              <SelectContent>
                {floors.map((f) => <SelectItem key={f.floorKey} value={f.floorKey}>{f.floorName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label required>Seating Capacity</Label>
            <Input type="number" min={1} value={roomDraft.seatingCapacity} onChange={(e) => setRoomDraft({ ...roomDraft, seatingCapacity: Number(e.target.value) })} className="rounded-md" required />
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={roomDraft.hasProjector} onCheckedChange={(v) => setRoomDraft({ ...roomDraft, hasProjector: !!v })} /> Projector
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={roomDraft.hasSmartboard} onCheckedChange={(v) => setRoomDraft({ ...roomDraft, hasSmartboard: !!v })} /> Smartboard
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={roomDraft.hasAC} onCheckedChange={(v) => setRoomDraft({ ...roomDraft, hasAC: !!v })} /> AC
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={roomDraft.hasLabEquipment} onCheckedChange={(v) => setRoomDraft({ ...roomDraft, hasLabEquipment: !!v })} /> Lab Equipment
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={roomDraft.isExamHallEligible} onCheckedChange={(v) => setRoomDraft({ ...roomDraft, isExamHallEligible: !!v })} /> Exam Hall Eligible
            </label>
          </div>
        </div>
      </FormDialog>

      <AlertDialog open={!!deleteCampusTarget} onOpenChange={(v) => !v && setDeleteCampusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteCampusTarget?.campusName}"?</AlertDialogTitle>
            <AlertDialogDescription>Remove its buildings first if it has any. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteCampus(); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteBuildingTarget} onOpenChange={(v) => !v && setDeleteBuildingTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteBuildingTarget?.buildingName}"?</AlertDialogTitle>
            <AlertDialogDescription>Remove its rooms first if it has any. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteBuilding(); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteRoomTarget} onOpenChange={(v) => !v && setDeleteRoomTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteRoomTarget?.roomName}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); confirmDeleteRoom(); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
