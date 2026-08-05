/**
 * SmartTempoPage — Dedicated Standalone Page for Smart Tempo Benchmark & Accuracy Dashboard
 * Accessible via /smart-tempo route.
 */

import React from "react";
import { Link } from "react-router-dom";
import { SmartTempoAccuracyDashboard } from "../components/SmartTempoAccuracyDashboard.js";
import styles from "./SmartTempoPage.module.css";

export function SmartTempoPage() {
  const adminBackUrl = import.meta.env.DEV ? "/admin?section=dev" : "/admin";
  return (
    <div className={styles.pageContainer}>
      <header className={styles.topBar}>
        <div className={styles.leftSection}>
          <Link
            to={adminBackUrl}
            className={styles.backBtn}
            title="Wróć do panelu sterowania"
          >
            ← Wróć do Panelu Admina
          </Link>
          <div className={styles.pageHeaderInfo}>
            <h1 className={styles.pageTitle}>Analiza Smart Tempo vs Logic Pro</h1>
            <p className={styles.pageSubtitle}>
              Dedykowany panel wizualizacji odchyleń siatki taktowej, histogramów oraz analizy regresji
            </p>
          </div>
        </div>
        <div className={styles.rightSection}>
          <span className={styles.versionBadge}>Smart Tempo 5.5 · Multi-Band Anchor Engine</span>
        </div>
      </header>

      <main className={styles.mainContent}>
        <SmartTempoAccuracyDashboard />
      </main>
    </div>
  );
}
