Login 401 checklist

- Verify the user exists in MongoDB collection UserAccount with the given `Username`
- Confirm the `Password` you're entering matches the stored one:
  - Server handles both legacy plaintext and bcrypt-hashed passwords
- Ensure `isVerified` is true; otherwise server returns 403 (not 401)
- If you see 401, it's typically wrong username or password
- Server sets the session token in an HTTP-only cookie; frontend doesn't need to store token

Dev tips:
- You can temporarily create a user via /api/auth/register then check your email configuration for verification
- Or directly insert a user document in MongoDB with a known password (bcrypt hash) and isVerified:true
- Server env indicates CLIENT_ORIGIN is http://10.14.77.107:5173 so cross-origin cookies are allowed
