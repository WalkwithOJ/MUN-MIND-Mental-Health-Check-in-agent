import resourcesJson from "@/config/resources.json";

interface Resource {
  id: string;
  name: string;
  phone: string | null;
}

const resources = (resourcesJson as { resources: Resource[] }).resources;

function formatPhoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Persistent footer disclaimer. Crisis phone numbers are read from
 * src/config/resources.json — never hardcoded. A staff member updating the
 * config file will automatically update the footer too.
 */
export function AppFooter() {
  const line988 = resources.find((r) => r.id === "helpline_988");
  const nlCrisis = resources.find((r) => r.id === "nl_crisis_line");

  return (
    <footer className="w-full border-t border-[var(--color-border-strong)] bg-[var(--color-surface)] mt-auto">
      <div className="max-w-[1280px] mx-auto px-6 py-6 flex flex-col gap-2 text-center text-[12px] leading-4 text-[var(--color-text-muted)]">
        <p>
          MUN MIND is not counselling or therapy. If you need support, help is
          available.
        </p>
        {(line988 || nlCrisis) && (
          <p>
            In crisis?
            {line988?.phone && (
              <>
                {" "}
                Call or text{" "}
                <a
                  href={formatPhoneHref(line988.phone)}
                  className="font-semibold text-[var(--color-primary)] underline"
                >
                  {line988.phone}
                </a>
              </>
            )}
            {nlCrisis?.phone && (
              <>
                {" "}· {nlCrisis.name}{" "}
                <a
                  href={formatPhoneHref(nlCrisis.phone)}
                  className="font-semibold text-[var(--color-primary)] underline"
                >
                  {nlCrisis.phone}
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </footer>
  );
}
