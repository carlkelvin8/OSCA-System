import Link from "next/link";
import Image from "next/image";
import styles from "./page.module.css";

export const metadata = {
  title: "OSCA – National Aviation Academy of Philippines",
  description: "Office of Sports and Cultural Affairs — Attendance & Inventory Management System",
};

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f4f6fb", color: "#0f1b35", minHeight: "100vh" }}>

      {/* TOP BAR */}
      <div className={styles.topbar}>
        <div className={styles.topbarBrand}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.8">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          National Aviation Academy of Philippines &ndash; Main Campus
        </div>
        <div className={styles.topbarActions}>
          <Link href="/login" className={`${styles.btnTopbar} ${styles.btnLogin}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Login
          </Link>
          <Link href="/register" className={`${styles.btnTopbar} ${styles.btnRegister}`}>
            Register Account
          </Link>
        </div>
      </div>

      {/* NAV */}
      <nav className={styles.nav}>
        <a href="#home" className={`${styles.navLink} ${styles.navLinkActive}`}>Home</a>
        <a href="#about" className={styles.navLink}>About Us</a>
        <a href="#services" className={styles.navLink}>Services</a>
        <a href="#contact" className={styles.navLink}>Contact</a>
      </nav>

      {/* HERO */}
      <section className={styles.hero} id="home">
        <div className={styles.heroLogo}>
          <div className={styles.logoCircle}>
            <Image
              src="/osca-logo.png"
              alt="OSCA Logo"
              width={152}
              height={152}
              style={{ objectFit: "cover", borderRadius: "50%" }}
              priority
            />
          </div>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroLabel}>
            <span className={styles.heroDot}></span>
            NAAP &ndash; Main Campus
          </div>
          <h1 className={styles.heroTitle}>
            Office of <em className={styles.heroTitleAccent}>Sports</em> and<br />
            Cultural Affairs
          </h1>
          <div className={styles.heroDivider}></div>
          <p className={styles.heroSubtitle}>
            Promoting and Supporting <strong>Student Athletes</strong> and <strong>Artists</strong>{" "}
            through Quality <strong>Sports</strong> and <strong>Cultural Programs</strong>
          </p>
          <div className={styles.heroCta}>
            <Link href="/login" className={styles.btnHeroPrimary}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Sign In
            </Link>
            <Link href="/register" className={styles.btnHeroSecondary}>
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* CARDS */}
      <section className={styles.cardsSection} id="about">

        <div className={`${styles.card} ${styles.cardAbout}`}>
          <div className={styles.cardBadge}>About OSCA</div>
          <p>
            The <strong>Office of Sports and Cultural Affairs</strong> (OSCA) is committed to
            promoting, facilitating, and developing holistic student athletes and artists
            by providing <strong>access to quality sports</strong> and <strong>cultural trainings,
              practices, and opportunities</strong> that foster <strong>excellence</strong>, discipline, and creativity.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardBadge}>· Mission ·</div>
          <span className={styles.cardIcon}>🏆</span>
          <p>
            To promote, facilitate and develop holistic student athlete and artist at all levels.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardBadge}>· Vision ·</div>
          <span className={styles.cardIcon}>🎨</span>
          <p>
            To empower students to reach their full potential in sports and arts.
          </p>
        </div>

      </section>

      {/* FOOTER */}
      <footer id="contact" className={styles.footer}>
        <div className={styles.footerLeft}>
          <a href="mailto:osca@naap.edu.ph">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            osca@naap.edu.ph
          </a>
          <a href="#">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            NAAP Main Campus, Philippines
          </a>
        </div>
        <div className={styles.footerRight}>
          <span>© OSCA – NAAP Campus</span>
          <span className={styles.footerDivider}>|</span>
          <a href="#">Privacy Policy</a>
          <span className={styles.footerDivider}>|</span>
          <a href="#">Terms of Use</a>
        </div>
      </footer>

    </div>
  );
}
