import { dictionaries, type Lang } from "@/i18n";
import { customerCopy } from "./copy";

export function getCustomerNavigationLabel(lang: Lang, isAuthenticated: boolean) {
  return isAuthenticated
    ? customerCopy[lang].accountTitle
    : dictionaries[lang].topBar.signIn;
}
