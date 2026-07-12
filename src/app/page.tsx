import { Brand } from "@/components/brand/brand";
import { ScaffoldStatus } from "@/features/validation/components/scaffold-status";

import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand />
        <span className={styles.status}>Scaffold ready</span>
      </header>
      <main className={styles.main}>
        <ScaffoldStatus />
      </main>
      <footer className={styles.footer}>
        For entertainment, not decision-making.
      </footer>
    </div>
  );
}
