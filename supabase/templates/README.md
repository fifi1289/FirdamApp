# Firdam auth emails

Paste each file into Supabase → Authentication → Emails → Templates. Every link goes to firdam.com (never supabase.co):

| Supabase template | File | Subject |
|---|---|---|
| Confirm signup | confirm-signup.html | Confirm your email · تأكيد بريدك · Confirmez votre e-mail |
| Reset password | reset-password.html | Reset your password · إعادة تعيين كلمة المرور · Réinitialiser le mot de passe |
| Change email address | change-email.html | Confirm your new email · تأكيد البريد الجديد · Nouvelle adresse e-mail |
| Magic link | magic-link.html | Your Firdam sign-in link · رابط الدخول · Lien de connexion |
| Invite user | invite.html | You are invited to Firdam · دعوة إلى فردام · Invitation à Firdam |

`/auth/confirm` checks the token on firdam.com; the reset link goes to `/auth/reset-password`, which already checks it.
In Supabase → Authentication → URL Configuration, keep **Site URL** = https://firdam.com and add https://firdam.com/** to the redirect URLs.
