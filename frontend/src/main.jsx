import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { ShieldCheck, LogOut, Search, Upload, Bell } from "lucide-react";
import axios from "axios";
import "./styles.css";
const api = axios.create({ baseURL: "http://localhost:5000" });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
function Login({ done }) {
  const [e, setE] = useState("officer@securesure.com"),
    [p, setP] = useState("Password123!"),
    [err, setErr] = useState("");
  async function go(x) {
    x.preventDefault();
    try {
      const { data } = await api.post("/auth/login", { email: e, password: p });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      done(data.user);
    } catch (x) {
      setErr(x.response?.data?.message || "Login failed");
    }
  }
  return (
    <div className="login">
      <div className="loginCard">
        <ShieldCheck size={34} />
        <small>SECURESURE INSURANCE</small>
        <h1>Claims Intelligence</h1>
        <p>AI-assisted claim triage for authorized claims officers.</p>
        <form onSubmit={go}>
          <label>
            Email
            <input value={e} onChange={(x) => setE(x.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={p}
              onChange={(x) => setP(x.target.value)}
            />
          </label>
          {err && <div className="err">{err}</div>}
          <button>Sign in</button>
        </form>
      </div>
    </div>
  );
}
const sts = [
  "NEW",
  "UNDER_REVIEW",
  "ADDITIONAL_INFO_REQUIRED",
  "APPROVED",
  "REJECTED",
  "SETTLEMENT_IN_PROGRESS",
  "CLOSED",
];
function App() {
  const [user, setUser] = useState(() =>
      JSON.parse(localStorage.getItem("user") || "null"),
    ),
    [claims, setClaims] = useState([]),
    [sel, setSel] = useState(null),
    [f, setF] = useState({ type: "", status: "", priority: "", search: "" }),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
    setClaims((await api.get("/api/claims", { params })).data);
  }
  async function open(id) {
    setSel((await api.get("/api/claims/" + id)).data);
  }
  useEffect(() => {
    if (user) load();
  }, [user, f.type, f.status, f.priority]);
  useEffect(() => {
    if (!user) return;
    const s = io("http://localhost:5000");
    s.on("claim:status-changed", (e) => {
      setNote(`${e.claimNumber} moved to ${e.status} by ${e.changedBy}`);
      load();
      if (sel?._id === e.claimId) open(e.claimId);
    });
    return () => s.disconnect();
  }, [user, sel?._id]);
  if (!user) return <Login done={setUser} />;
  async function status(x) {
    try {
      setSel(
        (await api.patch(`/api/claims/${sel._id}/status`, { status: x })).data,
      );
      load();
    } catch (e) {
      alert(e.response?.data?.message);
    }
  }
  async function assess() {
    setBusy(true);
    try {
      const d = (await api.post(`/api/claims/${sel._id}/generate-assessment`))
        .data;
      setSel({ ...sel, assessmentSummary: d.assessment });
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("document", file);
    await api.post(`/api/claims/${sel._id}/documents`, fd);
    open(sel._id);
  }
  function logout() {
    localStorage.clear();
    setUser(null);
  }
  return (
    <div>
      <header>
        <div className="brand">
          <ShieldCheck />
          <b>SecureSure</b>
          <span>Claims Intelligence</span>
        </div>
        <div>
          {user.name} · {user.role}{" "}
          <button className="ghost" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </header>
      {note && (
        <div className="toast">
          <Bell size={15} />
          {note}
          <button onClick={() => setNote("")}>×</button>
        </div>
      )}
      <main>
        <div className="hero">
          <div>
            <small>CLAIMS OPERATIONS</small>
            <h1>Claim review workspace</h1>
            <p>
              Review evidence, retrieve policy context and generate advisory
              assessments.
            </p>
          </div>
          <div className="stats">
            <div>
              <small>Visible</small>
              <b>{claims.length}</b>
            </div>
            <div>
              <small>Under review</small>
              <b>{claims.filter((x) => x.status === "UNDER_REVIEW").length}</b>
            </div>
            <div>
              <small>High priority</small>
              <b>{claims.filter((x) => x.priority === "HIGH").length}</b>
            </div>
          </div>
        </div>
        <div className="filters">
          <div className="search">
            <Search size={16} />
            <input
              placeholder="Search claim, policy or customer"
              value={f.search}
              onChange={(e) => setF({ ...f, search: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          {[
            ["type", ["HEALTH", "MOTOR", "TRAVEL", "PROPERTY"], "All types"],
            ["status", sts, "All statuses"],
            ["priority", ["LOW", "MEDIUM", "HIGH"], "All priorities"],
          ].map(([k, a, t]) => (
            <select
              key={k}
              value={f[k]}
              onChange={(e) => setF({ ...f, [k]: e.target.value })}
            >
              <option value="">{t}</option>
              {a.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          ))}
        </div>
        <div className="grid">
          <section className="list">
            <h3>
              Claims <small>{claims.length} records</small>
            </h3>
            {claims.map((c) => (
              <button
                className={"row " + (sel?._id === c._id ? "active" : "")}
                onClick={() => open(c._id)}
                key={c._id}
              >
                <div>
                  <b>{c.claimNumber}</b>
                  <span>{c.customerName}</span>
                </div>
                <div>
                  <i className={c.priority}>{c.priority}</i>
                  <span>{c.status}</span>
                  <b>₹{Number(c.claimedAmount || 0).toLocaleString("en-IN")}</b>
                </div>
              </button>
            ))}
          </section>
          <section className="detail">
            {!sel ? (
              <div className="empty">
                <ShieldCheck size={42} />
                <h2>Select a claim</h2>
                <p>Choose a claim to inspect details.</p>
              </div>
            ) : (
              <>
                <div className="detailHead">
                  <div>
                    <small>
                      {sel.claimType} · {sel.priority} PRIORITY
                    </small>
                    <h2>{sel.claimNumber}</h2>
                    <p>
                      {sel.customerName} · {sel.policyNumber}
                    </p>
                  </div>
                  <select
                    value={sel.status}
                    onChange={(e) => status(e.target.value)}
                  >
                    {sts.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
                <div className="cards">
                  <div>
                    Claimed amount
                    <b>
                      ₹{Number(sel.claimedAmount || 0).toLocaleString("en-IN")}
                    </b>
                  </div>
                  <div>
                    Incident date
                    <b>
                      {sel.incidentDate
                        ? new Date(sel.incidentDate).toLocaleDateString()
                        : "—"}
                    </b>
                  </div>
                  <div>
                    Documents<b>{sel.supportingDocuments?.length || 0}</b>
                  </div>
                </div>
                <article>
                  <h3>Incident description</h3>
                  <p>{sel.incidentDescription || "No description provided."}</p>
                </article>
                <article>
                  <div className="cardTitle">
                    <h3>Supporting documents</h3>
                    <label className="upload">
                      <Upload size={15} /> Upload
                      <input type="file" hidden onChange={upload} />
                    </label>
                  </div>
                  {sel.supportingDocuments?.length ? (
                    sel.supportingDocuments.map((d) => (
                      <div className="doc" key={d._id}>
                        {d.originalName}
                        <span>{Math.round(d.size / 1024)} KB</span>
                      </div>
                    ))
                  ) : (
                    <p>No supporting documents uploaded.</p>
                  )}
                </article>
                <article>
                  <div className="cardTitle">
                    <div>
                      <h3>AI-assisted assessment</h3>
                      <p>
                        Advisory only — final decision remains with the claims
                        officer.
                      </p>
                    </div>
                    <button onClick={assess} disabled={busy}>
                      {busy ? "Assessing…" : "Generate assessment"}
                    </button>
                  </div>
                  {sel.assessmentSummary ? (
                    <pre>{sel.assessmentSummary}</pre>
                  ) : (
                    <div className="placeholder">
                      Generate an assessment to retrieve policy context and
                      identify missing information.
                    </div>
                  )}
                </article>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
