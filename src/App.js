import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  MEMBER_COLORS,
  JOB_CATEGORIES,
  CAT,
  DOW_LABELS,
  WEEKDAY_LABELS,
  INIT_MEMBERS,
  INIT_JOBS,
} from "./constants";
import {
  toKey,
  addDays,
  getMondayOfWeek,
  getMonthCells,
  fmtShort,
} from "./utils/dates";
import { makeToken, buildICS, triggerDownload } from "./utils/calendar";
import { ModalWrap, LabelField } from "./components/ModalWrap";
import { QuickAssign } from "./components/QuickAssign";
import { LoginScreen } from "./components/LoginScreen";
import { SignupScreen } from "./components/SignupScreen";
import { MyAccountModal } from "./components/MyAccountModal";
import { UserManagementModal } from "./components/UserManagementModal";
import { InviteModal } from "./components/InviteModal";

// ═════════════════════════════════════════════════════════════════════════════
// Main App
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const today = useMemo(() => new Date(), []);

  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isAdmin = currentUser?.role === "admin";

  const [pendingInvite, setPendingInvite] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setCurrentUser(null);
        setUsers([]);
        setInvites([]);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchProfile(authUser) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();
    if (data) {
      setCurrentUser({
        id: authUser.id,
        email: authUser.email,
        name: data.name,
        username: data.username || "",
        role: data.role || "viewer",
      });
      if (data.role === "admin") {
        fetchAllUsers();
        fetchAllInvites();
      }
    }
    setAuthLoading(false);
  }

  async function fetchAllUsers() {
    const { data } = await supabase.from("profiles").select("*").order("name");
    if (data) setUsers(data);
  }

  async function fetchAllInvites() {
    const { data } = await supabase
      .from("invites")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setInvites(data);
  }

  const [mainView, setMainView] = useState("schedule");
  const [calView, setCalView] = useState("month");

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(today));

  const [members, setMembers] = useState(INIT_MEMBERS);
  const [jobs, setJobs] = useState(INIT_JOBS);
  const [assignments, setAssignments] = useState({});
  const [timeOff, setTimeOff] = useState({});

  const [modal, setModal] = useState(null);
  const [assignForm, setAssignForm] = useState({ memberId: "", jobIds: [] });
  const [newJob, setNewJob] = useState({
    name: "",
    category: "Metal Fab",
    mannDays: 10,
    notes: "",
  });
  const [newMember, setNewMember] = useState({
    name: "",
    hoursPerDay: 8,
    colorIdx: 0,
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const [dayDetail, setDayDetail] = useState(null);
  const [showUsers, setShowUsers] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const monthCells = useMemo(
    () => getMonthCells(calYear, calMonth),
    [calYear, calMonth],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const monthLabel = useMemo(
    () =>
      new Date(calYear, calMonth, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [calYear, calMonth],
  );
  const filteredJobs = useMemo(
    () =>
      filterCat === "All" ? jobs : jobs.filter((j) => j.category === filterCat),
    [jobs, filterCat],
  );
  const todayKey = toKey(today);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function requireAdmin() {
    if (isAdmin) return true;
    notify("View only — contact an admin to make changes.");
    return false;
  }

  function getAssign(dk, mid) {
    return assignments[dk]?.[mid] || [];
  }
  function setAssign(dk, mid, jids) {
    setAssignments((prev) => ({
      ...prev,
      [dk]: { ...(prev[dk] || {}), [mid]: jids },
    }));
  }
  function removeAssign(dk, mid, jid) {
    if (!requireAdmin()) return;
    setAssignments((prev) => {
      const day = { ...(prev[dk] || {}) };
      day[mid] = (day[mid] || []).filter((id) => id !== jid);
      return { ...prev, [dk]: day };
    });
  }

  function getMemberTimeOff(dk, mid) {
    return timeOff[dk]?.[mid] || null;
  }
  function setMemberTimeOff(dk, mid, type) {
    if (!requireAdmin()) return;
    setTimeOff((prev) => ({
      ...prev,
      [dk]: { ...(prev[dk] || {}), [mid]: type },
    }));
    setAssign(dk, mid, []);
  }
  function clearMemberTimeOff(dk, mid) {
    if (!requireAdmin()) return;
    setTimeOff((prev) => {
      const day = { ...(prev[dk] || {}) };
      delete day[mid];
      return { ...prev, [dk]: day };
    });
  }
  function dayTimeOffCounts(dk) {
    const day = timeOff[dk] || {};
    return {
      sick: Object.values(day).filter((v) => v === "sick").length,
      vacation: Object.values(day).filter((v) => v === "vacation").length,
    };
  }
  function memberMonthTimeOff(mid) {
    let sick = 0,
      vacation = 0;
    for (const day of Object.values(timeOff)) {
      if (day[mid] === "sick") sick++;
      if (day[mid] === "vacation") vacation++;
    }
    return { sick, vacation };
  }

  function mdUsed(jid) {
    return Object.values(assignments)
      .flatMap((d) => Object.values(d))
      .flat()
      .filter((id) => id === jid).length;
  }
  function mdStats(job) {
    const used = mdUsed(job.id);
    const allocated = job.mannDays;
    const overage = Math.max(0, used - allocated);
    const withinBudget = Math.min(used, allocated);
    return {
      used,
      allocated,
      overage,
      withinBudget,
      isOver: used > allocated,
      pctBase: Math.min(100, (withinBudget / allocated) * 100),
      pctOver: Math.min(50, (overage / allocated) * 100),
    };
  }

  function dayUniqueJobs(dk) {
    const ids = [...new Set(Object.values(assignments[dk] || {}).flat())];
    return ids.map((id) => jobs.find((j) => j.id === id)).filter(Boolean);
  }
  function dayJobCrew(dk, jid) {
    return Object.entries(assignments[dk] || {})
      .filter(([, jids]) => jids.includes(jid))
      .map(([mid]) => members.find((m) => m.id === mid))
      .filter(Boolean);
  }
  function dayPersonCount(dk) {
    const assigned = Object.values(assignments[dk] || {}).filter(
      (j) => j.length > 0,
    ).length;
    const off = Object.values(timeOff[dk] || {}).filter(Boolean).length;
    return assigned + off;
  }
  function memberWeekHours(mid) {
    return weekDays.reduce((sum, d) => {
      const dk = toKey(d);
      return (
        sum +
        (getAssign(dk, mid).length > 0
          ? members.find((m) => m.id === mid)?.hoursPerDay || 8
          : 0)
      );
    }, 0);
  }

  function submitAssign() {
    if (!requireAdmin()) return;
    if (!modal?.dk || !assignForm.memberId) return;
    setAssign(modal.dk, assignForm.memberId, assignForm.jobIds);
    setModal(null);
  }
  function doAddJob() {
    if (!requireAdmin()) return;
    if (!newJob.name.trim()) return;
    setJobs((prev) => [
      ...prev,
      { ...newJob, id: `j${Date.now()}`, name: newJob.name.trim() },
    ]);
    setNewJob({ name: "", category: "Metal Fab", mannDays: 10, notes: "" });
    setModal(null);
    notify("Job added.");
  }
  function updateNotes(jid, notes) {
    if (!requireAdmin()) return;
    setJobs((prev) => prev.map((j) => (j.id === jid ? { ...j, notes } : j)));
  }
  function doAddMember() {
    if (!requireAdmin()) return;
    if (!newMember.name.trim()) return;
    setMembers((prev) => [
      ...prev,
      { ...newMember, id: `m${Date.now()}`, name: newMember.name.trim() },
    ]);
    setNewMember({
      name: "",
      hoursPerDay: 8,
      colorIdx: (newMember.colorIdx + 1) % MEMBER_COLORS.length,
    });
    setModal(null);
    notify("Member added.");
  }

  function prevMonth() {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else setCalMonth((m) => m + 1);
  }
  function goToday() {
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
    setWeekStart(getMondayOfWeek(today));
  }

  const S = {
    navBtn: {
      padding: "6px 14px",
      borderRadius: 8,
      border: "1px solid #E5E7EB",
      background: "#fff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      color: "#374151",
    },
    blueBtn: {
      padding: "7px 16px",
      borderRadius: 8,
      background: "#2D6BE4",
      color: "#fff",
      border: "none",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
    },
    greenBtn: {
      padding: "7px 16px",
      borderRadius: 8,
      background: "#065F46",
      color: "#fff",
      border: "none",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
    },
    cancelBtn: {
      flex: 1,
      padding: "9px",
      borderRadius: 9,
      border: "1.5px solid #E5E7EB",
      background: "#fff",
      fontSize: 14,
      cursor: "pointer",
      fontWeight: 600,
      color: "#6B7280",
    },
    input: {
      width: "100%",
      padding: "9px 12px",
      borderRadius: 8,
      border: "1.5px solid #E5E7EB",
      fontSize: 14,
      background: "#fff",
      boxSizing: "border-box",
    },
  };

  if (authLoading) return null;

  if (pendingInvite && !currentUser) {
    return (
      <SignupScreen
        invite={pendingInvite}
        onSignup={() => {
          setPendingInvite(null);
        }}
        onBackToLogin={() => setPendingInvite(null)}
      />
    );
  }

  if (!currentUser)
    return (
      <LoginScreen onSignupWithInvite={(invite) => setPendingInvite(invite)} />
    );

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: "#F1F4F9",
        minHeight: "100vh",
        color: "#111827",
      }}
    >
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111827",
            color: "#fff",
            borderRadius: 10,
            padding: "10px 22px",
            fontSize: 13,
            zIndex: 9999,
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #E5E7EB",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 58,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg,#2D6BE4,#7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            MS{" "}
          </div>
          <span
            style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.4px" }}
          >
            Master Scheduler
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 5,
              background: isAdmin ? "#EEF3FF" : "#F3F4F6",
              color: isAdmin ? "#2D6BE4" : "#6B7280",
              border: `1px solid ${isAdmin ? "#C7D7FA" : "#E5E7EB"}`,
            }}
          >
            {isAdmin ? "Admin" : "Viewer"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[
            ["schedule", "Schedule"],
            ["jobs", "Jobs"],
            ["members", "Team"],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setMainView(v)}
              style={{
                padding: "5px 13px",
                borderRadius: 7,
                border: "none",
                background: mainView === v ? "#2D6BE4" : "#F3F4F6",
                color: mainView === v ? "#fff" : "#6B7280",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}

          {isAdmin && (
            <button
              onClick={() => setShowUsers(true)}
              style={{
                padding: "5px 13px",
                borderRadius: 7,
                border: "1px solid #E5E7EB",
                background: "#fff",
                color: "#374151",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Users
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              style={{
                padding: "5px 13px",
                borderRadius: 7,
                border: "1.5px solid #0891B2",
                background: "#fff",
                color: "#0891B2",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Invite
            </button>
          )}

          <div style={{ position: "relative", marginLeft: 2 }}>
            <button
              onClick={() => setExportOpen((o) => !o)}
              style={{
                padding: "5px 13px",
                borderRadius: 7,
                border: "1.5px solid #2D6BE4",
                background: "#fff",
                color: "#2D6BE4",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ↗ Export
            </button>
            {exportOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 36,
                  background: "#fff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  zIndex: 200,
                  minWidth: 210,
                  overflow: "hidden",
                }}
              >
                {["Apple Calendar (.ics)", "Google Calendar (.ics)"].map(
                  (label) => (
                    <button
                      key={label}
                      onClick={() => {
                        triggerDownload(
                          buildICS(assignments, members, jobs),
                          "master-schedule.ics",
                        );
                        setExportOpen(false);
                        notify(
                          "Downloaded — import the .ics in your calendar app.",
                        );
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        fontSize: 13,
                        cursor: "pointer",
                        color: "#111827",
                      }}
                    >
                      {label}
                    </button>
                  ),
                )}
                <div
                  style={{
                    borderTop: "1px solid #E5E7EB",
                    padding: "7px 16px",
                    fontSize: 11,
                    color: "#9CA3AF",
                  }}
                >
                  Import .ics into your calendar app
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: 4,
              paddingLeft: 10,
              borderLeft: "1px solid #E5E7EB",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: isAdmin
                  ? "linear-gradient(135deg,#2D6BE4,#7C3AED)"
                  : "#E5E7EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                color: isAdmin ? "#fff" : "#6B7280",
                fontSize: 12,
              }}
            >
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  lineHeight: 1.2,
                }}
              >
                {currentUser.name}
              </div>
              {currentUser.email && (
                <div
                  style={{ fontSize: 10, color: "#9CA3AF", lineHeight: 1.2 }}
                >
                  {currentUser.email}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAccount(true)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                background: "#F3F4F6",
                color: "#374151",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Account
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                background: "#F3F4F6",
                color: "#6B7280",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div
          style={{
            background: "#FFFBEB",
            borderBottom: "1px solid #FDE68A",
            padding: "8px 24px",
            fontSize: 12,
            color: "#92400E",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <strong>View-only mode.</strong> You can see the full schedule but
          cannot make changes. Contact an admin to update assignments.
        </div>
      )}

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "20px 16px" }}>
        {/* ══ SCHEDULE VIEW ══ */}
        {mainView === "schedule" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  background: "#1A1D23",
                  borderRadius: 8,
                  padding: 3,
                  gap: 2,
                }}
              >
                <button
                  onClick={() => setCalView("month")}
                  style={{
                    padding: "6px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: calView === "month" ? "#2D6BE4" : "transparent",
                    color: calView === "month" ? "#fff" : "#9CA3AF",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Month
                </button>
                <button
                  onClick={() => setCalView("week")}
                  style={{
                    padding: "6px 18px",
                    borderRadius: 6,
                    border: "none",
                    background: calView === "week" ? "#2D6BE4" : "transparent",
                    color: calView === "week" ? "#fff" : "#9CA3AF",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Week
                </button>
              </div>

              {calView === "month" ? (
                <>
                  <button onClick={prevMonth} style={S.navBtn}>
                    ‹
                  </button>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 17,
                      minWidth: 170,
                      textAlign: "center",
                    }}
                  >
                    {monthLabel}
                  </span>
                  <button onClick={nextMonth} style={S.navBtn}>
                    ›
                  </button>
                  <button
                    onClick={goToday}
                    style={{
                      ...S.navBtn,
                      borderColor: "#2D6BE4",
                      color: "#2D6BE4",
                    }}
                  >
                    Today
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setWeekStart((d) => addDays(d, -7))}
                    style={S.navBtn}
                  >
                    ‹ Prev
                  </button>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      minWidth: 210,
                      textAlign: "center",
                    }}
                  >
                    {fmtShort(weekDays[0])} – {fmtShort(weekDays[4])},{" "}
                    {weekDays[0].getFullYear()}
                  </span>
                  <button
                    onClick={() => setWeekStart((d) => addDays(d, 7))}
                    style={S.navBtn}
                  >
                    Next ›
                  </button>
                  <button
                    onClick={goToday}
                    style={{
                      ...S.navBtn,
                      borderColor: "#2D6BE4",
                      color: "#2D6BE4",
                    }}
                  >
                    Today
                  </button>
                </>
              )}

              <div style={{ flex: 1 }} />
              {isAdmin && (
                <button
                  onClick={() => setModal({ type: "addJob" })}
                  style={S.blueBtn}
                >
                  + Job
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setModal({ type: "addMember" })}
                  style={S.greenBtn}
                >
                  + Member
                </button>
              )}
            </div>

            {/* Month View */}
            {calView === "month" && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: "1px solid #E5E7EB",
                  overflow: "hidden",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    background: "#1A1D23",
                  }}
                >
                  {DOW_LABELS.map((h) => (
                    <div
                      key={h}
                      style={{
                        padding: "10px 0",
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                  }}
                >
                  {monthCells.map((cellDate, idx) => {
                    const dk = toKey(cellDate);
                    const inMonth = cellDate.getMonth() === calMonth;
                    const isToday = dk === todayKey;
                    const isWeekend =
                      cellDate.getDay() === 0 || cellDate.getDay() === 6;
                    const dayJobList = dayUniqueJobs(dk);
                    const toCounts = dayTimeOffCounts(dk);
                    const peopleCount = dayPersonCount(dk);
                    const membersOut = Object.entries(timeOff[dk] || {})
                      .map(([mid, type]) => ({
                        member: members.find((m) => m.id === mid),
                        type,
                      }))
                      .filter((x) => x.member);
                    const baseBg = !inMonth
                      ? "#F5F5F5"
                      : isWeekend
                        ? "#FAFBFF"
                        : "#fff";
                    return (
                      <div
                        key={idx}
                        onClick={() => setDayDetail(dk)}
                        style={{
                          minHeight: 110,
                          borderRight: "1px solid #EFEFEF",
                          borderBottom: "1px solid #EFEFEF",
                          padding: "5px 7px",
                          background: baseBg,
                          cursor: "pointer",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#EEF3FF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = baseBg;
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 3,
                          }}
                        >
                          <div
                            style={{
                              width: 25,
                              height: 25,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: isToday ? 800 : 600,
                              background: isToday ? "#2D6BE4" : "transparent",
                              color: isToday
                                ? "#fff"
                                : inMonth
                                  ? "#111827"
                                  : "#C0C7D0",
                            }}
                          >
                            {cellDate.getDate()}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 3,
                              flexWrap: "wrap",
                            }}
                          >
                            {peopleCount - toCounts.sick - toCounts.vacation >
                              0 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#6B7280",
                                  fontWeight: 700,
                                  background: "#F3F4F6",
                                  borderRadius: 4,
                                  padding: "1px 4px",
                                }}
                              >
                                {peopleCount -
                                  toCounts.sick -
                                  toCounts.vacation}{" "}
                                crew
                              </span>
                            )}
                            {toCounts.sick > 0 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#DC2626",
                                  fontWeight: 700,
                                  background: "#FEF2F2",
                                  borderRadius: 4,
                                  padding: "1px 4px",
                                }}
                              >
                                {toCounts.sick}🤒
                              </span>
                            )}
                            {toCounts.vacation > 0 && (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#0891B2",
                                  fontWeight: 700,
                                  background: "#ECFEFF",
                                  borderRadius: 4,
                                  padding: "1px 4px",
                                }}
                              >
                                {toCounts.vacation}🌴
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {dayJobList.slice(0, 2).map((job) => {
                            const c = CAT[job.category] || CAT["Other"];
                            const st = mdStats(job);
                            const crew = dayJobCrew(dk, job.id);
                            return (
                              <div
                                key={job.id}
                                style={{
                                  background: st.isOver ? "#FEF2F2" : c.light,
                                  borderLeft: `3px solid ${st.isOver ? "#DC2626" : c.dot}`,
                                  borderRadius: "0 4px 4px 0",
                                  padding: "2px 5px",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: st.isOver ? "#DC2626" : c.bg,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {job.name}
                                </div>
                                {crew.length > 0 && (
                                  <div
                                    style={{
                                      fontSize: 9,
                                      color: "#6B7280",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {crew
                                      .map((m) => m.name.split(" ")[0])
                                      .join(", ")}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {dayJobList.length > 2 && (
                            <div
                              style={{
                                fontSize: 9,
                                color: "#6B7280",
                                fontWeight: 600,
                                paddingLeft: 3,
                              }}
                            >
                              +{dayJobList.length - 2} more
                            </div>
                          )}
                          {membersOut.slice(0, 2).map(({ member, type }) => (
                            <div
                              key={member.id}
                              style={{
                                background:
                                  type === "sick" ? "#FEF2F2" : "#ECFEFF",
                                borderLeft: `3px solid ${type === "sick" ? "#DC2626" : "#0891B2"}`,
                                borderRadius: "0 4px 4px 0",
                                padding: "2px 5px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color:
                                    type === "sick" ? "#DC2626" : "#0891B2",
                                }}
                              >
                                {type === "sick" ? "🤒" : "🌴"}{" "}
                                {member.name.split(" ")[0]}
                              </div>
                            </div>
                          ))}
                          {membersOut.length > 2 && (
                            <div
                              style={{
                                fontSize: 9,
                                color: "#6B7280",
                                fontWeight: 600,
                                paddingLeft: 3,
                              }}
                            >
                              +{membersOut.length - 2} out
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Week View */}
            {calView === "week" && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: "1px solid #E5E7EB",
                  overflow: "hidden",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px repeat(5, 1fr)",
                    background: "#1A1D23",
                  }}
                >
                  <div
                    style={{
                      padding: "11px 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Member
                  </div>
                  {weekDays.map((d, i) => {
                    const isToday = toKey(d) === todayKey;
                    return (
                      <div
                        key={i}
                        style={{
                          borderLeft: "1px solid #2A2D35",
                          padding: "8px 12px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: "#9CA3AF",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {WEEKDAY_LABELS[i]}
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            marginTop: 2,
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isToday ? "#2D6BE4" : "transparent",
                            color: "#fff",
                          }}
                        >
                          {d.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {members.map((member, mi) => {
                  const mc =
                    MEMBER_COLORS[member.colorIdx % MEMBER_COLORS.length];
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "160px repeat(5, 1fr)",
                        borderBottom:
                          mi < members.length - 1
                            ? "1px solid #F3F4F6"
                            : "none",
                        minHeight: 68,
                      }}
                    >
                      <div
                        style={{
                          padding: "9px 12px",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          borderRight: "1px solid #E5E7EB",
                        }}
                      >
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 7,
                            background: mc.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            color: "#fff",
                            fontSize: 10,
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {member.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12 }}>
                            {member.name}
                          </div>
                          <div style={{ fontSize: 10, color: "#9CA3AF" }}>
                            {member.hoursPerDay}h/day
                          </div>
                        </div>
                      </div>
                      {weekDays.map((d, di) => {
                        const dk = toKey(d);
                        const assignedIds = getAssign(dk, member.id);
                        const assignedJobs = assignedIds
                          .map((id) => jobs.find((j) => j.id === id))
                          .filter(Boolean);
                        const isToday = dk === todayKey;
                        const to = getMemberTimeOff(dk, member.id);
                        const baseCellBg =
                          to === "sick"
                            ? "#FFF0F0"
                            : to === "vacation"
                              ? "#F0FAFF"
                              : isToday
                                ? "#F8FAFF"
                                : "transparent";
                        return (
                          <div
                            key={di}
                            onClick={() => {
                              if (!isAdmin) {
                                notify(
                                  "View only — contact an admin to make changes.",
                                );
                                return;
                              }
                              if (to) {
                                setDayDetail(dk);
                                return;
                              }
                              setAssignForm({
                                memberId: member.id,
                                jobIds: [...assignedIds],
                              });
                              setModal({
                                type: "assign",
                                dk,
                                memberName: member.name,
                              });
                            }}
                            style={{
                              borderLeft: "1px solid #E5E7EB",
                              padding: "5px 7px",
                              cursor: isAdmin ? "pointer" : "default",
                              background: baseCellBg,
                              minHeight: 68,
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={(e) => {
                              if (isAdmin && !to)
                                e.currentTarget.style.background = "#F0F4FF";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = baseCellBg;
                            }}
                          >
                            {to === "sick" && (
                              <div
                                style={{
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexDirection: "column",
                                  gap: 2,
                                }}
                              >
                                <span style={{ fontSize: 16 }}>🤒</span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#DC2626",
                                    fontWeight: 700,
                                  }}
                                >
                                  Sick
                                </span>
                              </div>
                            )}
                            {to === "vacation" && (
                              <div
                                style={{
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexDirection: "column",
                                  gap: 2,
                                }}
                              >
                                <span style={{ fontSize: 16 }}>🌴</span>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#0891B2",
                                    fontWeight: 700,
                                  }}
                                >
                                  Vacation
                                </span>
                              </div>
                            )}
                            {!to &&
                              assignedJobs.map((job) => {
                                const c = CAT[job.category] || CAT["Other"];
                                return (
                                  <div
                                    key={job.id}
                                    style={{
                                      background: c.light,
                                      border: `1.5px solid ${c.dot}`,
                                      borderRadius: 6,
                                      padding: "3px 6px",
                                      marginBottom: 2,
                                      position: "relative",
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 3,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 5,
                                          height: 5,
                                          borderRadius: "50%",
                                          background: c.dot,
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 700,
                                          color: c.bg,
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          maxWidth: 105,
                                        }}
                                      >
                                        {job.name}
                                      </span>
                                    </div>
                                    {isAdmin && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeAssign(dk, member.id, job.id);
                                        }}
                                        style={{
                                          position: "absolute",
                                          top: 2,
                                          right: 3,
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          color: "#D1D5DB",
                                          fontSize: 10,
                                          padding: 0,
                                          lineHeight: 1,
                                        }}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            {!to && assignedJobs.length === 0 && (
                              <div
                                style={{
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#E5E7EB",
                                  fontSize: 16,
                                }}
                              >
                                {isAdmin ? "+" : ""}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 14,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              {Object.entries(CAT).map(([cat, c]) => (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: "#6B7280",
                  }}
                >
                  <div
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: c.dot,
                    }}
                  />
                  {cat}
                </div>
              ))}
              <span style={{ fontSize: 11, color: "#C0C7D0", marginLeft: 4 }}>
                🤒 Sick &nbsp; 🌴 Vacation
              </span>
            </div>
          </div>
        )}

        {/* ══ JOBS VIEW ══ */}
        {mainView === "jobs" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["All", ...JOB_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 7,
                      border: "none",
                      background: filterCat === cat ? "#2D6BE4" : "#F3F4F6",
                      color: filterCat === cat ? "#fff" : "#6B7280",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button
                  onClick={() => setModal({ type: "addJob" })}
                  style={S.blueBtn}
                >
                  + New Job
                </button>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))",
                gap: 14,
              }}
            >
              {filteredJobs.map((job) => {
                const c = CAT[job.category] || CAT["Other"];
                const st = mdStats(job);
                return (
                  <div
                    key={job.id}
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      border: "1px solid #E5E7EB",
                      padding: "18px 20px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          background: c.light,
                          border: `2px solid ${c.dot}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 17,
                          flexShrink: 0,
                        }}
                      >
                        {c.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            lineHeight: 1.3,
                          }}
                        >
                          {job.name}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: c.bg,
                            background: c.light,
                            padding: "1px 7px",
                            borderRadius: 4,
                          }}
                        >
                          {job.category}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "#6B7280",
                          marginBottom: 5,
                        }}
                      >
                        <span>Mann Days</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: st.isOver ? "#DC2626" : "#111827",
                          }}
                        >
                          {st.used} / {st.allocated} MD
                          {st.isOver && (
                            <span
                              style={{
                                marginLeft: 6,
                                color: "#DC2626",
                                fontWeight: 800,
                              }}
                            >
                              +{st.overage} OVER
                            </span>
                          )}
                        </span>
                      </div>
                      <div
                        style={{
                          background: "#F3F4F6",
                          borderRadius: 6,
                          height: 10,
                          overflow: "hidden",
                          display: "flex",
                        }}
                      >
                        <div
                          style={{
                            width: `${st.pctBase}%`,
                            height: "100%",
                            background:
                              st.pctBase > 80 && !st.isOver ? "#D97706" : c.dot,
                            borderRadius: st.isOver ? "6px 0 0 6px" : 6,
                          }}
                        />
                        {st.isOver && (
                          <div
                            style={{
                              width: `${st.pctOver}%`,
                              height: "100%",
                              background: "#DC2626",
                              backgroundImage:
                                "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.25) 3px, rgba(255,255,255,0.25) 6px)",
                              borderRadius: "0 6px 6px 0",
                            }}
                          />
                        )}
                      </div>
                      {st.isOver && (
                        <div
                          style={{
                            textAlign: "right",
                            fontSize: 10,
                            color: "#DC2626",
                            marginTop: 3,
                            fontWeight: 700,
                          }}
                        >
                          ▲ {st.overage} MD overage · {st.overage * 8}h over
                          budget
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {st.isOver ? (
                        <>
                          <div
                            style={{
                              flex: 1,
                              background: "#FEF2F2",
                              borderRadius: 8,
                              padding: "7px 10px",
                              textAlign: "center",
                              border: "1.5px solid #FECACA",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 800,
                                color: "#DC2626",
                              }}
                            >
                              +{st.overage}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#DC2626",
                                fontWeight: 700,
                              }}
                            >
                              MD over
                            </div>
                          </div>
                          <div
                            style={{
                              flex: 1,
                              background: "#FEF2F2",
                              borderRadius: 8,
                              padding: "7px 10px",
                              textAlign: "center",
                              border: "1.5px solid #FECACA",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 800,
                                color: "#DC2626",
                              }}
                            >
                              +{st.overage * 8}h
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#DC2626",
                                fontWeight: 700,
                              }}
                            >
                              hrs over
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              flex: 1,
                              background: "#F8FAFC",
                              borderRadius: 8,
                              padding: "7px 10px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 18,
                                fontWeight: 800,
                                color: c.bg,
                              }}
                            >
                              {Math.max(0, st.allocated - st.used)}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#9CA3AF",
                                fontWeight: 600,
                              }}
                            >
                              MD remaining
                            </div>
                          </div>
                          <div
                            style={{
                              flex: 1,
                              background: "#F8FAFC",
                              borderRadius: 8,
                              padding: "7px 10px",
                              textAlign: "center",
                            }}
                          >
                            <div style={{ fontSize: 18, fontWeight: 800 }}>
                              {Math.max(0, st.allocated - st.used) * 8}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#9CA3AF",
                                fontWeight: 600,
                              }}
                            >
                              hrs remaining
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {st.isOver && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#DC2626",
                          fontWeight: 700,
                          background: "#FEF2F2",
                          borderRadius: 6,
                          padding: "6px 10px",
                          marginBottom: 12,
                          border: "1px solid #FECACA",
                        }}
                      >
                        🚨 OVERAGE — {st.overage} MD ({st.overage * 8}h) beyond
                        allocation of {st.allocated} MD
                      </div>
                    )}
                    {!st.isOver && st.pctBase >= 80 && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#D97706",
                          fontWeight: 700,
                          background: "#FFFBEB",
                          borderRadius: 6,
                          padding: "4px 8px",
                          marginBottom: 12,
                        }}
                      >
                        {Math.max(0, st.allocated - st.used)} MD remaining —
                        approaching limit
                      </div>
                    )}
                    <div
                      style={{ borderTop: "1px solid #F3F4F6", paddingTop: 10 }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#6B7280",
                          marginBottom: 5,
                        }}
                      >
                        📝 Notes
                      </div>
                      <textarea
                        value={job.notes || ""}
                        onChange={(e) => updateNotes(job.id, e.target.value)}
                        disabled={!isAdmin}
                        placeholder={
                          isAdmin
                            ? "Add notes, punch list items, reminders…"
                            : "No notes."
                        }
                        rows={3}
                        style={{
                          width: "100%",
                          fontSize: 12,
                          color: "#374151",
                          background: isAdmin ? "#F8FAFC" : "#F3F4F6",
                          border: "1.5px solid #E5E7EB",
                          borderRadius: 8,
                          padding: "7px 10px",
                          resize: isAdmin ? "vertical" : "none",
                          fontFamily: "inherit",
                          lineHeight: 1.5,
                          boxSizing: "border-box",
                          outline: "none",
                          cursor: isAdmin ? "text" : "default",
                        }}
                        onFocus={(e) => {
                          if (isAdmin) e.target.style.borderColor = "#2D6BE4";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#E5E7EB";
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {isAdmin && (
                <button
                  onClick={() => setModal({ type: "addJob" })}
                  style={{
                    border: "2px dashed #D1D5DB",
                    borderRadius: 14,
                    background: "none",
                    cursor: "pointer",
                    color: "#9CA3AF",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 160,
                  }}
                >
                  + Add Job
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══ MEMBERS VIEW ══ */}
        {mainView === "members" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                Team Members
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setModal({ type: "addMember" })}
                  style={S.blueBtn}
                >
                  + Add Member
                </button>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))",
                gap: 14,
              }}
            >
              {members.map((member) => {
                const mc =
                  MEMBER_COLORS[member.colorIdx % MEMBER_COLORS.length];
                const maxWk = member.hoursPerDay * 5;
                const usedWk = memberWeekHours(member.id);
                const pct = Math.min(100, (usedWk / maxWk) * 100);
                const tof = memberMonthTimeOff(member.id);
                return (
                  <div
                    key={member.id}
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      border: "1px solid #E5E7EB",
                      padding: "18px 20px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: mc.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          color: "#fff",
                          fontSize: 15,
                        }}
                      >
                        {member.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                          {member.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                          {member.hoursPerDay}h/day · {maxWk}h/wk max
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#6B7280",
                        marginBottom: 5,
                      }}
                    >
                      <span>This week</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: pct >= 100 ? "#DC2626" : "#111827",
                        }}
                      >
                        {usedWk}h / {maxWk}h
                      </span>
                    </div>
                    <div
                      style={{
                        background: "#F3F4F6",
                        borderRadius: 6,
                        height: 8,
                        overflow: "hidden",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: pct >= 100 ? "#DC2626" : mc.bg,
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    {(tof.sick > 0 || tof.vacation > 0) && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        {tof.sick > 0 && (
                          <div
                            style={{
                              flex: 1,
                              background: "#FEF2F2",
                              borderRadius: 8,
                              padding: "5px 8px",
                              fontSize: 11,
                              color: "#DC2626",
                              fontWeight: 700,
                              textAlign: "center",
                            }}
                          >
                            🤒 {tof.sick}d sick
                          </div>
                        )}
                        {tof.vacation > 0 && (
                          <div
                            style={{
                              flex: 1,
                              background: "#ECFEFF",
                              borderRadius: 8,
                              padding: "5px 8px",
                              fontSize: 11,
                              color: "#0891B2",
                              fontWeight: 700,
                              textAlign: "center",
                            }}
                          >
                            🌴 {tof.vacation}d vacation
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <div
                        style={{
                          flex: 1,
                          background: mc.light,
                          borderRadius: 8,
                          padding: "6px 10px",
                          fontSize: 11,
                          color: mc.bg,
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        {maxWk - usedWk}h available
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() =>
                            setMembers((prev) =>
                              prev.filter((m) => m.id !== member.id),
                            )
                          }
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            background: "#FEF2F2",
                            color: "#DC2626",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {isAdmin && (
                <button
                  onClick={() => setModal({ type: "addMember" })}
                  style={{
                    border: "2px dashed #D1D5DB",
                    borderRadius: 14,
                    background: "none",
                    cursor: "pointer",
                    color: "#9CA3AF",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 160,
                  }}
                >
                  + Add Member
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && isAdmin && (
        <InviteModal
          invites={invites}
          onCreateInvite={async ({ role, email }) => {
            const token = makeToken();
            const { data } = await supabase
              .from("invites")
              .insert({ token, role, email, used: false })
              .select()
              .single();
            if (data) setInvites((prev) => [data, ...prev]);
          }}
          onRevokeInvite={async (token) => {
            await supabase.from("invites").delete().eq("token", token);
            setInvites((prev) => prev.filter((i) => i.token !== token));
          }}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* User Management */}
      {showUsers && isAdmin && (
        <UserManagementModal
          users={users}
          currentUser={currentUser}
          onUpdate={async (updated) => {
            const { error } = await supabase
              .from("profiles")
              .update({
                name: updated.name,
                username: updated.username,
                email: updated.email,
                role: updated.role,
              })
              .eq("id", updated.id);
            if (!error) {
              setUsers((prev) =>
                prev.map((u) => (u.id === updated.id ? updated : u)),
              );
              if (updated.id === currentUser.id) setCurrentUser(updated);
            }
          }}
          onAdd={() => {}}
          onDelete={async (id) => {
            await supabase.from("profiles").delete().eq("id", id);
            setUsers((prev) => prev.filter((u) => u.id !== id));
          }}
          onClose={() => setShowUsers(false)}
        />
      )}

      {/* My Account Modal */}
      {showAccount && (
        <MyAccountModal
          user={currentUser}
          allUsers={users}
          onSave={(updated) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === updated.id ? updated : u)),
            );
            setCurrentUser(updated);
          }}
          onClose={() => setShowAccount(false)}
        />
      )}

      {/* Day Detail Modal */}
      {dayDetail && (
        <ModalWrap onClose={() => setDayDetail(null)}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>
                {new Date(dayDetail + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                {dayPersonCount(dayDetail)} people scheduled
              </div>
            </div>
            <button
              onClick={() => setDayDetail(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "#9CA3AF",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {dayUniqueJobs(dayDetail).length === 0 ? (
            <div style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 16 }}>
              {isAdmin
                ? "No assignments yet — add one below."
                : "No assignments for this day."}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 18,
              }}
            >
              {dayUniqueJobs(dayDetail).map((job) => {
                const c = CAT[job.category] || CAT["Other"];
                const crew = dayJobCrew(dayDetail, job.id);
                const st = mdStats(job);
                return (
                  <div
                    key={job.id}
                    style={{
                      background: c.light,
                      border: `1.5px solid ${c.dot}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: c.bg,
                        marginBottom: 4,
                      }}
                    >
                      {job.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: st.isOver ? "#DC2626" : "#6B7280",
                        marginBottom: 7,
                        fontWeight: st.isOver ? 700 : 400,
                      }}
                    >
                      {job.category} · {st.used}/{st.allocated} MD used
                      {st.isOver && (
                        <span style={{ marginLeft: 6 }}>
                          🚨 +{st.overage} OVER
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {crew.map((m) => {
                        const mc =
                          MEMBER_COLORS[m.colorIdx % MEMBER_COLORS.length];
                        return (
                          <div
                            key={m.id}
                            style={{
                              background: mc.bg,
                              color: "#fff",
                              borderRadius: 6,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {m.name}
                            {isAdmin && (
                              <button
                                onClick={() =>
                                  removeAssign(dayDetail, m.id, job.id)
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "rgba(255,255,255,0.65)",
                                  cursor: "pointer",
                                  fontSize: 11,
                                  padding: 0,
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isAdmin && (
            <div
              style={{
                borderTop: "1px solid #E5E7EB",
                paddingTop: 14,
                marginBottom: 0,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#6B7280",
                  marginBottom: 10,
                }}
              >
                Mark time off
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 180,
                  overflowY: "auto",
                  marginBottom: 14,
                }}
              >
                {members.map((member) => {
                  const mc =
                    MEMBER_COLORS[member.colorIdx % MEMBER_COLORS.length];
                  const to = getMemberTimeOff(dayDetail, member.id);
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 8,
                        background:
                          to === "sick"
                            ? "#FEF2F2"
                            : to === "vacation"
                              ? "#ECFEFF"
                              : "#F8FAFC",
                        border: `1px solid ${to === "sick" ? "#FECACA" : to === "vacation" ? "#A5F3FC" : "#E5E7EB"}`,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: mc.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          color: "#fff",
                          fontSize: 10,
                          flexShrink: 0,
                        }}
                      >
                        {member.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>
                        {member.name}
                      </span>
                      <button
                        onClick={() =>
                          to === "sick"
                            ? clearMemberTimeOff(dayDetail, member.id)
                            : setMemberTimeOff(dayDetail, member.id, "sick")
                        }
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: to === "sick" ? "#DC2626" : "#F3F4F6",
                          color: to === "sick" ? "#fff" : "#374151",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🤒 Sick
                      </button>
                      <button
                        onClick={() =>
                          to === "vacation"
                            ? clearMemberTimeOff(dayDetail, member.id)
                            : setMemberTimeOff(dayDetail, member.id, "vacation")
                        }
                        style={{
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: to === "vacation" ? "#0891B2" : "#F3F4F6",
                          color: to === "vacation" ? "#fff" : "#374151",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🌴 Vacation
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isAdmin && (
            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#6B7280",
                  marginBottom: 10,
                }}
              >
                Assign a team member to a job
              </div>
              <QuickAssign
                members={members}
                jobs={jobs}
                onAssign={(mid, jid) => {
                  const existing = getAssign(dayDetail, mid);
                  if (getMemberTimeOff(dayDetail, mid))
                    clearMemberTimeOff(dayDetail, mid);
                  if (!existing.includes(jid))
                    setAssign(dayDetail, mid, [...existing, jid]);
                }}
              />
            </div>
          )}
        </ModalWrap>
      )}

      {/* Assign Modal (week cell) */}
      {modal?.type === "assign" && isAdmin && (
        <ModalWrap onClose={() => setModal(null)}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
            Assign Jobs
          </div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>
            {modal.memberName} ·{" "}
            {new Date(modal.dk + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
          {getMemberTimeOff(modal.dk, assignForm.memberId) && (
            <div
              style={{
                background:
                  getMemberTimeOff(modal.dk, assignForm.memberId) === "sick"
                    ? "#FEF2F2"
                    : "#ECFEFF",
                border: `1px solid ${getMemberTimeOff(modal.dk, assignForm.memberId) === "sick" ? "#FECACA" : "#A5F3FC"}`,
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 12,
                fontSize: 12,
                fontWeight: 700,
                color:
                  getMemberTimeOff(modal.dk, assignForm.memberId) === "sick"
                    ? "#DC2626"
                    : "#0891B2",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span>
                {getMemberTimeOff(modal.dk, assignForm.memberId) === "sick"
                  ? "🤒 Marked as Sick"
                  : "🌴 On Vacation"}{" "}
                — assignments blocked
              </span>
              <button
                onClick={() =>
                  clearMemberTimeOff(modal.dk, assignForm.memberId)
                }
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "inherit",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Clear
              </button>
            </div>
          )}
          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 14,
            }}
          >
            {jobs.map((job) => {
              const c = CAT[job.category] || CAT["Other"];
              const checked = assignForm.jobIds.includes(job.id);
              const isBlocked = !!getMemberTimeOff(
                modal.dk,
                assignForm.memberId,
              );
              const st = mdStats(job);
              return (
                <label
                  key={job.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: 9,
                    border: `1.5px solid ${checked ? c.dot : "#E5E7EB"}`,
                    background: checked ? c.light : "#FAFAFA",
                    cursor: isBlocked ? "not-allowed" : "pointer",
                    opacity: isBlocked ? 0.45 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isBlocked}
                    onChange={() =>
                      !isBlocked &&
                      setAssignForm((f) => ({
                        ...f,
                        jobIds: f.jobIds.includes(job.id)
                          ? f.jobIds.filter((id) => id !== job.id)
                          : [...f.jobIds, job.id],
                      }))
                    }
                    style={{ width: 15, height: 15, accentColor: c.dot }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {job.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: st.isOver ? "#DC2626" : "#9CA3AF",
                        fontWeight: st.isOver ? 700 : 400,
                      }}
                    >
                      {job.category} · {st.used}/{job.mannDays} MD{" "}
                      {st.isOver
                        ? `· 🚨 +${st.overage} OVER`
                        : `· ${job.mannDays - st.used} left`}
                    </div>
                  </div>
                  {st.isOver && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#DC2626",
                        fontWeight: 800,
                        background: "#FEF2F2",
                        padding: "2px 6px",
                        borderRadius: 4,
                        flexShrink: 0,
                        border: "1px solid #FECACA",
                      }}
                    >
                      🚨 +{st.overage}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setModal(null)} style={S.cancelBtn}>
              Cancel
            </button>
            <button onClick={submitAssign} style={S.blueBtn}>
              Save
            </button>
          </div>
        </ModalWrap>
      )}

      {/* Add Job Modal */}
      {modal?.type === "addJob" && isAdmin && (
        <ModalWrap onClose={() => setModal(null)}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>
            Add New Job
          </div>
          <LabelField label="Job Name">
            <input
              value={newJob.name}
              onChange={(e) =>
                setNewJob((j) => ({ ...j, name: e.target.value }))
              }
              placeholder="e.g. Platt Reach Hood"
              style={S.input}
              autoFocus
            />
          </LabelField>
          <LabelField label="Category">
            <select
              value={newJob.category}
              onChange={(e) =>
                setNewJob((j) => ({ ...j, category: e.target.value }))
              }
              style={S.input}
            >
              {JOB_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </LabelField>
          <LabelField label="Mann Days (MD)">
            <input
              type="number"
              value={newJob.mannDays}
              onChange={(e) =>
                setNewJob((j) => ({ ...j, mannDays: Number(e.target.value) }))
              }
              min={1}
              max={500}
              style={S.input}
            />
          </LabelField>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 14 }}>
            1 MD = 1 person × 1 full day. {newJob.mannDays} MD ≈{" "}
            {newJob.mannDays * 8} labor hours.
          </div>
          <LabelField label="Notes (optional)">
            <textarea
              value={newJob.notes}
              onChange={(e) =>
                setNewJob((j) => ({ ...j, notes: e.target.value }))
              }
              placeholder="Add notes, punch list items…"
              rows={3}
              style={{ ...S.input, resize: "vertical", lineHeight: 1.5 }}
            />
          </LabelField>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setModal(null)} style={S.cancelBtn}>
              Cancel
            </button>
            <button onClick={doAddJob} style={S.blueBtn}>
              Add Job
            </button>
          </div>
        </ModalWrap>
      )}

      {/* Add Member Modal */}
      {modal?.type === "addMember" && isAdmin && (
        <ModalWrap onClose={() => setModal(null)}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>
            Add Team Member
          </div>
          <LabelField label="Name">
            <input
              value={newMember.name}
              onChange={(e) =>
                setNewMember((m) => ({ ...m, name: e.target.value }))
              }
              placeholder="Full name"
              style={S.input}
              autoFocus
            />
          </LabelField>
          <LabelField label="Hours per Day">
            <input
              type="number"
              value={newMember.hoursPerDay}
              onChange={(e) =>
                setNewMember((m) => ({
                  ...m,
                  hoursPerDay: Number(e.target.value),
                }))
              }
              min={1}
              max={16}
              style={S.input}
            />
          </LabelField>
          <LabelField label="Color">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MEMBER_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setNewMember((m) => ({ ...m, colorIdx: i }))}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: c.bg,
                    border:
                      newMember.colorIdx === i
                        ? "3px solid #111827"
                        : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </LabelField>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => setModal(null)} style={S.cancelBtn}>
              Cancel
            </button>
            <button onClick={doAddMember} style={S.blueBtn}>
              Add Member
            </button>
          </div>
        </ModalWrap>
      )}
    </div>
  );
}
