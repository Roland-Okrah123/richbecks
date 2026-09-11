import { auth } from '../firebase';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function callRichBecksApi<T>(
  path: string,
  payload: unknown,
): Promise<{ data: T }> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be signed in.');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  let body: any = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      body?.message || 'The RichBecks API request failed.',
    );
  }

  return {
    data: body?.data as T,
  };
}
