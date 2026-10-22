import { redirect } from 'next/navigation';

/** With OAuth, signing up and signing in are the same flow. */
export default function SignupPage() {
	redirect('/login');
}
