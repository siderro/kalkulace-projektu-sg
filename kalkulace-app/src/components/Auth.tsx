import type { AuthState } from '../hooks/useAuth';

interface Props {
  auth: AuthState;
}

export function AuthGate({ auth }: Props) {
  if (auth.loading) {
    return <div className="auth-loading">Načítání...</div>;
  }

  return (
    <div className="auth-screen">
      <div className="auth-box">
        <h1>Kalkulace projektu SG</h1>
        <p>Interní generátor cenových nabídek</p>
        {auth.error && <div className="auth-error">{auth.error}</div>}
        <button onClick={auth.signIn} className="btn btn-primary">
          Přihlásit se přes Google
        </button>
        <p className="auth-hint">Pouze pro uživatele @svejda-goldmann.cz</p>
      </div>
    </div>
  );
}
