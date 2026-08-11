import { Button } from "@stagesync/ui";
import { BrandName } from "../../BrandName.js";
import styles from "../SystemView.module.css";

export function ApkTile({
  product,
  ready,
  apkUrl,
  onOpenQr,
}: {
  product: "Performer" | "Console";
  ready: boolean;
  apkUrl: string | null;
  onOpenQr: (product: "Performer" | "Console", url: string) => void;
}) {
  const fullName = `StageSync ${product}`;
  return (
    <div className={styles.apkTile}>
      <h3 className={styles.apkTitle}>
        <BrandName /> {product}
      </h3>
      <div className={styles.apkActions}>
        {ready && apkUrl ? (
          <Button
            variant="secondary"
            aria-label={`Pobierz APK ${fullName}`}
            onClick={() => onOpenQr(product, apkUrl)}
          >
            Pobierz APK
          </Button>
        ) : (
          <p className={styles.apkStatus}>APK niedostępne na hoście</p>
        )}
      </div>
    </div>
  );
}
