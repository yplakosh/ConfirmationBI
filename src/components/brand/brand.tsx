import Link from "next/link";

import styles from "./brand.module.css";

export function Brand() {
  return (
    <Link className={styles.brand} href="/" aria-label="ConfirmationBI home">
      <span className={styles.mark} aria-hidden="true">
        <span className={styles.bar} />
        <span className={styles.bar} />
        <span className={styles.bar} />
      </span>
      <span>
        Confirmation<span className={styles.accent}>BI</span>
      </span>
    </Link>
  );
}
