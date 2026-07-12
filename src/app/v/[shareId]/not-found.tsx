import Link from "next/link";

import { Brand } from "@/components/brand/brand";

import styles from "./shared-validation.module.css";

export default function SharedValidationNotFound() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand />
      </header>
      <main className={styles.main}>
        <span className={styles.eyebrow}>Unlisted report</span>
        <h1>This validation could not be located.</h1>
        <p>
          The link may be incomplete, or the report may have been removed from the
          approved narrative.
        </p>
        <Link className={styles.action} href="/">
          Create a new validation →
        </Link>
      </main>
    </div>
  );
}
