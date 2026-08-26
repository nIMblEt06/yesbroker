export interface PickedContact {
  name?: string[];
  tel?: string[];
}

interface ContactsManager {
  getProperties(): Promise<string[]>;
  select(
    properties: string[],
    options?: { multiple?: boolean }
  ): Promise<PickedContact[]>;
}

type NavigatorWithContacts = Navigator & { contacts?: ContactsManager };

export function contactsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "contacts" in navigator &&
    "ContactsManager" in window
  );
}

export async function pickContacts(multiple: boolean): Promise<PickedContact[]> {
  const cm = (navigator as NavigatorWithContacts).contacts;
  if (!cm) throw new Error("Contact Picker not supported");
  return cm.select(["name", "tel"], { multiple });
}
