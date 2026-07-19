"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useSpring } from "framer-motion";

/* ═══ STAR FIELD ═══ */
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let id: number;
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    resize(); addEventListener("resize", resize);
    const stars: { x: number; y: number; r: number; o: number; t: number; sp: number }[] = [];
    for (let i = 0; i < 80; i++) stars.push({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.5 + 0.5, o: Math.random() * 0.5 + 0.1, t: Math.random() * Math.PI * 2, sp: Math.random() * 0.01 + 0.003 });
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of stars) {
        p.t += p.sp;
        const fl = p.o * (0.5 + 0.5 * Math.sin(p.t));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 168, 76, ${fl})`; ctx.fill();
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(id);
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ═══ MAIN PAGE ═══ */
export default function WelcomeClient() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 50, damping: 20 });

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#0a1628", color: "#fff", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      <StarField />
      {/* Progress bar */}
      <motion.div style={{ scaleX, position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #C9A84C, #f5d778)", zIndex: 999, transformOrigin: "left" }} />

      {/* ─── NAVBAR ─── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7 }}
        style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,22,40,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(201,168,76,0.15)", padding: "12px 24px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Image src="/osca-logo.png" alt="OSCA" width={44} height={44} style={{ borderRadius: "50%" }} priority />
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#C9A84C" }}>OSCA System</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>NAAP · Villamor Campus</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/login" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, color: "#C9A84C", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 10, textDecoration: "none" }}>Sign In</Link>
            <Link href="/register" style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, color: "#0a1628", background: "#C9A84C", borderRadius: 10, textDecoration: "none" }}>Register</Link>
          </div>
        </div>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section style={{ position: "relative", zIndex: 10, minHeight: "85vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px 60px" }}>
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 80, delay: 0.2 }}>
          <div style={{ width: 130, height: 130, margin: "0 auto 32px", borderRadius: "50%", border: "3px solid #C9A84C", padding: 4, boxShadow: "0 0 40px rgba(201,168,76,0.3)" }}>
            <Image src="/osca-logo.png" alt="OSCA Logo" width={120} height={120} style={{ borderRadius: "50%", objectFit: "cover" }} priority />
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 16 }}>
          Office of <span style={{ color: "#C9A84C" }}>Sports</span> and<br />Cultural Affairs
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", maxWidth: 560, lineHeight: 1.7, margin: "0 auto 36px" }}>
          Promoting and Supporting <strong style={{ color: "#fff" }}>Student Athletes</strong> and <strong style={{ color: "#fff" }}>Artists</strong> through Quality <strong style={{ color: "#C9A84C" }}>Sports</strong> and <strong style={{ color: "#C9A84C" }}>Cultural Programs</strong>.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" style={{ padding: "14px 36px", fontWeight: 700, fontSize: 14, color: "#0a1628", background: "#C9A84C", borderRadius: 12, textDecoration: "none", boxShadow: "0 4px 20px rgba(201,168,76,0.3)" }}>Get Started</Link>
          <Link href="/register" style={{ padding: "14px 36px", fontWeight: 600, fontSize: 14, color: "#C9A84C", border: "1.5px solid rgba(201,168,76,0.4)", borderRadius: 12, textDecoration: "none" }}>Create Account</Link>
        </motion.div>
      </section>

      {/* ─── VISION & MISSION ─── */}
      <section style={{ position: "relative", zIndex: 10, padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ display: "inline-block", padding: "5px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C9A84C", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 50, marginBottom: 16 }}>About OSCA</span>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, marginBottom: 12 }}>Who We Are</h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            { title: "Vision", icon: "🌟", text: "To empower students to reach their full potential in sports and arts, fostering excellence, discipline, and creativity." },
            { title: "Mission", icon: "🏆", text: "To promote, facilitate and develop holistic student athletes and artists at all levels of competition and performance." },
            { title: "About", icon: "🏛️", text: "The Office of Sports and Cultural Affairs is committed to providing access to quality sports and cultural trainings, practices, and opportunities." },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} style={{ padding: "32px 24px", borderRadius: 20, background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.12)", textAlign: "center" }}>
              <span style={{ fontSize: 36, display: "block", marginBottom: 16 }}>{card.icon}</span>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#C9A84C", marginBottom: 10 }}>{card.title}</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{card.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── OSCA PERSONNEL ─── */}
      <section style={{ position: "relative", zIndex: 10, padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ display: "inline-block", padding: "5px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C9A84C", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 50, marginBottom: 16 }}>OSCA Personnel</span>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, marginBottom: 12 }}>Our Team</h2>
        </motion.div>

        {/* President */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ width: 80, height: 80, margin: "0 auto 12px", borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #f5d778)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#0a1628" }}>P</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>PROF. MARWIN M. DELA CRUZ, PH.D</p>
          <p style={{ fontSize: 12, color: "#C9A84C", fontWeight: 600 }}>President of National Aviation Academy of the Philippines</p>
        </motion.div>

        {/* Director & Staff */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { name: "ENGR. JEQ ZYRIUS A. SUDWESTE, MEA", role: "Director (interim)" },
            { name: "MNUR KHAN D. UMPA, MA.ED.", role: "Director of Sports and Cultural Affairs Unit" },
            { name: "JAYVEE CONDADA", role: "Office of Sports and Cultural Affairs - Staff" },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} style={{ padding: "20px 16px", borderRadius: 16, background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.1)", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, margin: "0 auto 10px", borderRadius: "50%", background: "rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#C9A84C" }}>{p.name[0]}</div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{p.role}</p>
            </motion.div>
          ))}
        </div>

        {/* Sports Coaches */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#C9A84C", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", marginBottom: 20 }}>Sports Coaches</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { name: "BERT BALAJADIA", role: "Head Coach of Taekwondo" },
              { name: "JAYVEE CONDADA", role: "Head Coach of Volleyball - Men" },
              { name: "RAY ALLEN CASTILLO", role: "Head Coach of Volleyball - Women" },
              { name: "JJ MALANAY", role: "Head Coach of Arnis" },
              { name: "ROI PAGUE", role: "Head Coach of Sepak Takraw" },
              { name: "DENNIS PAGLIGARAN", role: "Head Coach of Basketball" },
            ].map((coach, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} style={{ padding: "16px 12px", borderRadius: 12, background: "rgba(201,168,76,0.03)", border: "1px solid rgba(201,168,76,0.08)", textAlign: "center" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{coach.name}</p>
                <p style={{ fontSize: 10, color: "rgba(201,168,76,0.8)", marginTop: 4 }}>{coach.role}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trainers */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#C9A84C", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", marginBottom: 20 }}>Trainers</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {[
              { name: "JONATHAN IVAN LUKE MANEJA", role: "Trainer of Musika Himpapawid" },
              { name: "JOHANN CINCO", role: "Choir Conduction of Himig Himpapawid" },
            ].map((trainer, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} style={{ padding: "16px 12px", borderRadius: 12, background: "rgba(201,168,76,0.03)", border: "1px solid rgba(201,168,76,0.08)", textAlign: "center" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{trainer.name}</p>
                <p style={{ fontSize: 10, color: "rgba(201,168,76,0.8)", marginTop: 4 }}>{trainer.role}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── CONTACT ─── */}
      <section style={{ position: "relative", zIndex: 10, padding: "60px 24px", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span style={{ display: "inline-block", padding: "5px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C9A84C", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 50, marginBottom: 16 }}>Contact</span>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Get in Touch</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <a href="mailto:osca@naap.edu.ph" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>📧 osca@naap.edu.ph</a>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>📍 National Aviation Academy of the Philippines - Main Campus, Villamor</p>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(201,168,76,0.1)", padding: "24px", textAlign: "center" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/osca-logo.png" alt="OSCA" width={28} height={28} style={{ borderRadius: "50%" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#C9A84C" }}>OSCA System</span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>© 2024 Office of Sports and Cultural Affairs — National Aviation Academy of the Philippines</p>
          <div style={{ display: "flex", gap: 16 }}>
            <a href="#" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Privacy</a>
            <a href="#" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
