import styles from "./scaffold-status.module.css";

const foundations = [
  "Next.js App Router with strict TypeScript",
  "Feature-owned validation types and constants",
  "Approved IBM Plex typography and design tokens",
  "Environment placeholders for OpenAI and Supabase",
] as const;

export function ScaffoldStatus() {
  return (
    <section className={styles.panel} aria-labelledby="scaffold-title">
      <div className={styles.eyebrow}>Project foundation</div>
      <h1 className={styles.heading} id="scaffold-title">
        Data-driven validation for decisions you already made.
      </h1>
      <p className={styles.copy}>
        The application shell is ready. The next implementation slice replaces
        this status panel with the generator, analytical loading state, and
        results dashboard defined in the versioned design handoff.
      </p>
      <ul className={styles.items}>
        {foundations.map((foundation) => (
          <li className={styles.item} key={foundation}>
            <span className={styles.check} aria-hidden="true">
              ✓
            </span>
            <span className={styles.itemText}>{foundation}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
