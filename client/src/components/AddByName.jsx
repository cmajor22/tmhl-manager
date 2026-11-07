import { useState } from 'react';

/** Single text input + "Add X" button. Clears on success. */
export default function AddByName({ placeholder, buttonLabel, onAdd, disabled }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onAdd(value.trim());
      setValue('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mb-4" onSubmit={submit}>
      {error && <div className="alert alert-danger">{error}</div>}
      <input
        className="form-control mb-2"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        required
      />
      <button type="submit" className="btn btn-primary nav-btn" disabled={disabled || busy}>{buttonLabel}</button>
    </form>
  );
}
