import { httpsCallable } from 'firebase/functions';
import { functions, auth } from './firebase';

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
}

export interface LoadBankDetailsResult {
  ok: boolean;
  bankDetails: BankDetails | null;
}

export async function loadBankDetails(): Promise<LoadBankDetailsResult> {
  // Prefer HTTP endpoint to avoid CORS flakiness with callable in some setups
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : undefined;
  const resp = await fetch('https://europe-west2-stoveindustryapp-97cd8.cloudfunctions.net/loadBankDetailsHttp', {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return (await resp.json()) as LoadBankDetailsResult;
}

export interface SaveBankDetailsResult {
  ok: boolean;
}

export async function saveBankDetails(details: BankDetails): Promise<SaveBankDetailsResult> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : undefined;
  const resp = await fetch('https://europe-west2-stoveindustryapp-97cd8.cloudfunctions.net/saveBankDetailsHttp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(details)
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return (await resp.json()) as SaveBankDetailsResult;
}
