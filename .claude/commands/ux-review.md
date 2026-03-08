Start the app with `claude --chrome` so you have a browser available, then launch the ux-designer agent to do a thorough visual and usability review of the frontend.

## Steps

1. Run `pnpm dev:testdb` in the background to start the dev server with test data
2. Wait for the server to be ready on localhost:3000
3. Use the ux-designer agent to review every page of the app:
   - Login page
   - Dashboard
   - Holdings page
   - Transactions page
   - Any modals or forms (add/edit holding, add transaction)
4. For each page, evaluate:
   - Visual consistency and spacing
   - Mobile responsiveness (check at 375px, 768px, and 1024px+ widths)
   - Loading, error, and empty states
   - Accessibility (contrast, focus indicators, semantic HTML, aria labels)
   - Interaction patterns (hover states, click targets, form validation feedback)
5. Write all findings to `TODO.md` as a new UX review section with unchecked items
6. Stop the dev server when done
