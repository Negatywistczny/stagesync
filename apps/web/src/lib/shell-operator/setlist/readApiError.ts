async function readApiError(res: Response): Promise<string> {
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    /* ignore */
  }
  return message.slice(0, 500);
}

export { readApiError };
