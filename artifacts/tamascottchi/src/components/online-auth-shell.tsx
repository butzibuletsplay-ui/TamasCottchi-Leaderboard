import type React from 'react';
import { useEffect, useRef } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { Heart, ShieldCheck, Sparkles } from 'lucide-react';

type OnlineAuthShellProps = { children: React.ReactNode };

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function AuthCacheBoundary() {
  const queryClient = useQueryClient();
  const { user, isLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const userId = isLoaded && isSignedIn ? user?.id ?? null : null;
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      queryClient.clear();
    }
    previousUserId.current = userId;
  }, [queryClient, userId]);

  return null;
}

function SignInRoute() {
  return (
    <AuthPage mode="signin">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </AuthPage>
  );
}

function SignUpRoute() {
  return (
    <AuthPage mode="signup">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </AuthPage>
  );
}

function ClerkRoutes({ children }: OnlineAuthShellProps) {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={germanLocalization as never}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <AuthCacheBoundary />
        <Switch>
          <Route path="/sign-in/*?" component={SignInRoute} />
          <Route path="/sign-up/*?" component={SignUpRoute} />
          <Route path="/">{children}</Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

function AuthPage({ mode, children }: { mode: 'signin' | 'signup'; children: React.ReactNode }) {
  const isSignIn = mode === 'signin';
  return (
    <main className="ts-auth">
      <style>{authStyles}</style>
      <div className="ts-auth__grain" aria-hidden="true" />
      <section className="ts-auth__story">
        <a className="ts-auth__brand" href={`${basePath || ''}/`} aria-label="tamascottchi – zum Spiel">
          <img src={`${basePath}/logo.svg`} alt="" />
          <span>tamascottchi</span>
        </a>
        <div className="ts-auth__story-copy">
          <p className="ts-auth__kicker"><Sparkles size={15} /> EIN PLÄTZCHEN FÜR EUCH ZWEI</p>
          <h1>{isSignIn ? <>Schön, dass<br />du wieder da bist.</> : <>Ein kleines Zuhause<br />für deinen Scottchi.</>}</h1>
        <p>Richte dein Profil ein und sichere deinen gesamten Spielfortschritt in der Cloud.</p>
        </div>
        <div className="ts-auth__promise">
          <span className="ts-auth__promise-icon"><ShieldCheck size={19} /></span>
          <div><strong>Dein Konto, deine Kontrolle</strong><small>Du kannst deine Daten jederzeit löschen.</small></div>
        </div>
        <div className="ts-auth__scribble" aria-hidden="true">
          <span className="ts-auth__sun" />
          <span className="ts-auth__hill ts-auth__hill--one" />
          <span className="ts-auth__hill ts-auth__hill--two" />
          <span className="ts-auth__pet">t</span>
          <span className="ts-auth__spark ts-auth__spark--one">+</span>
          <span className="ts-auth__spark ts-auth__spark--two">+</span>
        </div>
      </section>
      <section className="ts-auth__form-side">
        <div className="ts-auth__form-wrap">
          <div className="ts-auth__mobile-brand">
            <img src={`${basePath}/logo.svg`} alt="" /><span>tamascottchi</span>
          </div>
          <div className="ts-auth__form-heading">
            <p>{isSignIn ? 'DEIN SPIEL WARTET' : 'LOS GEHT’S'}</p>
            <h2>{isSignIn ? 'Anmelden' : 'Konto anlegen'}</h2>
          <span>{isSignIn ? 'Melde dich an und mach dort weiter, wo ihr aufgehört habt.' : 'Ein Konto genügt, um dein Profil und deinen Spielstand sicher in der Cloud zu speichern.'}</span>
          </div>
          <div className="ts-auth__clerk">{children}</div>
          <p className="ts-auth__fineprint"><Heart size={13} /> Eine Anmeldung und Internetverbindung sind zum Spielen nötig.</p>
        </div>
      </section>
    </main>
  );
}

export function OnlineAuthShell({ children }: OnlineAuthShellProps) {
  return (
    <WouterRouter base={basePath}>
      <ClerkRoutes>{children}</ClerkRoutes>
    </WouterRouter>
  );
}

const germanLocalization = {
  locale: 'de-DE',
  signIn: {
    start: {
      title: 'Willkommen zurück',
      subtitle: 'Melde dich an, um dein Konto zu öffnen.',
      actionText: 'Noch kein Konto?',
      actionLink: 'Jetzt registrieren',
    },
    emailCode: { title: 'Prüfe dein Postfach', subtitle: 'Gib den Bestätigungscode ein.' },
    factorOne: { title: 'Identität bestätigen', subtitle: 'Fahre mit deiner Anmeldung fort.' },
  },
  signUp: {
    start: {
      title: 'Dein Konto beginnt hier',
      subtitle: 'Erstelle ein Konto für dein Profil und deinen Cloud-Spielstand.',
      actionText: 'Schon ein Konto?',
      actionLink: 'Jetzt anmelden',
    },
    emailCode: { title: 'Prüfe dein Postfach', subtitle: 'Gib den Bestätigungscode ein.' },
  },
  formFieldLabel__emailAddress: 'E-Mail-Adresse',
  formFieldLabel__password: 'Passwort',
  formFieldLabel__firstName: 'Vorname',
  formFieldLabel__lastName: 'Nachname',
  formFieldInputPlaceholder__emailAddress: 'deinname@beispiel.de',
  formFieldInputPlaceholder__password: 'Dein Passwort',
  formButtonPrimary: 'Weiter',
  backButton: 'Zurück',
  dividerText: 'oder',
  socialButtonsBlockButton: 'Weiter mit {{provider|titleize}}',
  'footerActionLink__use another method': 'Andere Methode verwenden',
  badge__requiresVerification: 'Bestätigung erforderlich',
  unstable__errors: {
    form_identifier_not_found: 'Für diese E-Mail-Adresse wurde kein Konto gefunden.',
    form_password_incorrect: 'Das Passwort stimmt nicht. Bitte versuche es erneut.',
    form_password_pwned: 'Bitte wähle ein anderes Passwort.',
  },
};

const clerkAppearance = {
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#bd6844',
    colorForeground: '#49352c',
    colorMutedForeground: '#806b5c',
    colorDanger: '#a94332',
    colorBackground: '#fff9ed',
    colorInput: '#fffdf8',
    colorInputForeground: '#49352c',
    colorNeutral: '#49352c',
    fontFamily: "'Nunito', sans-serif",
    borderRadius: '12px',
  },
  elements: {
    rootBox: { width: '100%', display: 'flex', justifyContent: 'center' },
    cardBox: { width: '100%', maxWidth: '430px', background: 'transparent', boxShadow: 'none' },
    card: { background: 'transparent', boxShadow: 'none', padding: '0' },
    headerTitle: { color: '#49352c', fontFamily: "'Fredoka', sans-serif", fontSize: '23px' },
    headerSubtitle: { color: '#806b5c' },
    formFieldLabel: { color: '#49352c', fontWeight: 800 },
    formFieldInput: { border: '1.5px solid #d9cbb5', borderRadius: '10px', background: '#fffdf8', boxShadow: 'none' },
    formButtonPrimary: { background: '#bd6844', color: '#fff9ed', borderRadius: '10px', boxShadow: '2px 3px 0 #49352c', fontWeight: 900 },
    socialButtonsBlockButton: { border: '1.5px solid #d9cbb5', borderRadius: '10px', background: '#fffdf8', color: '#49352c' },
    socialButtonsBlockButtonText: { color: '#49352c', fontWeight: 800 },
    dividerText: { color: '#806b5c' },
    footer: { background: 'transparent' },
    footerActionText: { color: '#806b5c' },
    footerActionLink: { color: '#a45034', fontWeight: 900 },
    formFieldSuccessText: { color: '#367267' },
    alertText: { color: '#49352c' },
    logoBox: { display: 'none' },
    main: { gap: '14px' },
  },
};

const authStyles = `
.ts-auth{--a-ink:#49352c;--a-paper:#fff5df;--a-card:#fff9ed;--a-clay:#bd6844;--a-sage:#d7e3d1;min-height:100dvh;display:grid;grid-template-columns:minmax(330px,.92fr) minmax(420px,1.08fr);background:var(--a-paper);color:var(--a-ink);font-family:'Nunito',sans-serif;position:relative;overflow:hidden}
.ts-auth__grain{position:fixed;inset:0;pointer-events:none;opacity:.19;background-image:radial-gradient(#806b5c 0.65px,transparent .75px);background-size:13px 13px;z-index:0}
.ts-auth__story{min-height:100dvh;padding:clamp(26px,5vw,66px);display:flex;flex-direction:column;position:relative;overflow:hidden;background:#dbe7d5;border-right:2px solid var(--a-ink);isolation:isolate}
.ts-auth__brand,.ts-auth__mobile-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--a-ink);font:700 25px/1 'Fredoka',sans-serif;letter-spacing:-.8px;position:relative;z-index:2}
.ts-auth__brand img,.ts-auth__mobile-brand img{width:42px;height:42px}
.ts-auth__story-copy{position:relative;z-index:2;margin:auto 0;padding:48px 0 180px;max-width:490px}
.ts-auth__kicker{display:flex;align-items:center;gap:8px;color:#826a54;font:500 10px 'DM Mono',monospace;letter-spacing:1.7px}
.ts-auth__kicker svg{color:var(--a-clay)}
.ts-auth__story-copy h1{font:600 clamp(42px,5.1vw,70px)/.99 'Fredoka',sans-serif;letter-spacing:-2.6px;margin:24px 0 17px}
.ts-auth__story-copy>p:last-child{max-width:350px;color:#66574a;line-height:1.65;font-size:15px}
.ts-auth__promise{position:relative;z-index:3;display:flex;gap:12px;align-items:center;width:max-content;max-width:100%;padding:12px 17px;border:1.5px solid var(--a-ink);border-radius:14px;background:#fff5df;box-shadow:3px 4px 0 var(--a-ink)}
.ts-auth__promise-icon{width:36px;height:36px;border-radius:11px;background:#f2d3b1;display:grid;place-items:center}
.ts-auth__promise strong,.ts-auth__promise small{display:block}.ts-auth__promise strong{font:600 14px 'Fredoka',sans-serif}.ts-auth__promise small{font-size:11px;color:#806b5c;margin-top:3px}
.ts-auth__scribble{position:absolute;left:0;right:0;bottom:-4px;height:270px;z-index:1;overflow:hidden}
.ts-auth__sun{position:absolute;width:132px;height:132px;right:15%;top:15px;border:2px solid var(--a-ink);background:#f1c77c;border-radius:50%}
.ts-auth__hill{position:absolute;border:2px solid var(--a-ink);border-radius:50% 50% 0 0}
.ts-auth__hill--one{width:115%;height:180px;left:-16%;bottom:-51px;background:#a9c4a2;transform:rotate(-5deg)}
.ts-auth__hill--two{width:105%;height:155px;right:-32%;bottom:-68px;background:#c4d5b4;transform:rotate(7deg)}
.ts-auth__pet{position:absolute;bottom:72px;left:43%;width:83px;height:90px;border:2px solid var(--a-ink);border-radius:46% 46% 42% 42%;background:#efb878;display:grid;place-items:center;font:700 46px 'Fredoka';box-shadow:3px 4px 0 var(--a-ink);transform:rotate(-6deg)}
.ts-auth__pet:before,.ts-auth__pet:after{content:'';position:absolute;width:25px;height:34px;top:-15px;background:#efb878;border:2px solid var(--a-ink);border-radius:75% 20% 40% 20%;z-index:-1}
.ts-auth__pet:before{left:1px;transform:rotate(-24deg)}.ts-auth__pet:after{right:1px;transform:scaleX(-1) rotate(-24deg)}
.ts-auth__spark{position:absolute;color:#a45034;font:700 26px 'Fredoka'}.ts-auth__spark--one{left:24%;top:27px}.ts-auth__spark--two{right:18%;top:89px;font-size:19px}
.ts-auth__form-side{min-height:100dvh;padding:36px 28px;display:grid;place-items:center;position:relative;z-index:1}
.ts-auth__form-wrap{width:min(100%,470px);padding:clamp(23px,4vw,46px);border:2px solid var(--a-ink);border-radius:24px;background:var(--a-card);box-shadow:7px 8px 0 var(--a-ink)}
.ts-auth__mobile-brand{display:none;margin-bottom:28px}.ts-auth__mobile-brand img{width:34px;height:34px}
.ts-auth__form-heading{margin-bottom:23px}.ts-auth__form-heading p{margin:0 0 7px;color:#99765d;font:500 10px 'DM Mono',monospace;letter-spacing:1.5px}.ts-auth__form-heading h2{font:600 34px/1 'Fredoka',sans-serif;letter-spacing:-.8px;margin:0 0 8px}.ts-auth__form-heading span{color:#806b5c;font-size:13px;line-height:1.55}
.ts-auth__clerk{width:100%}.ts-auth__fineprint{border-top:1px solid #e7dac5;padding-top:15px;margin:21px 0 0;color:#806b5c;font-size:11px;display:flex;gap:7px;align-items:center}.ts-auth__fineprint svg{color:#bd6844;flex:none}
@media(max-width:880px){.ts-auth{grid-template-columns:minmax(270px,.78fr) minmax(380px,1.22fr)}.ts-auth__story{padding:28px}.ts-auth__story-copy h1{font-size:52px}}
@media(max-width:700px){.ts-auth{grid-template-columns:1fr;min-height:100dvh}.ts-auth__story{display:none}.ts-auth__form-side{padding:22px 16px calc(24px + env(safe-area-inset-bottom));min-height:100dvh;align-items:start}.ts-auth__form-wrap{margin:auto 0;width:100%;padding:24px 21px;border-radius:20px;box-shadow:5px 6px 0 var(--a-ink)}.ts-auth__mobile-brand{display:flex}.ts-auth__form-heading h2{font-size:31px}}
`;
