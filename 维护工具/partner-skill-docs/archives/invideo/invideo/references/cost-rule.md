# Cost

Editor edits are free. Generation costs credits: price it first, say it, cap it.

- **Price first.** Run the generation with `invideo gen run … --dry-run` / `generate` with `dry_run: true`. It checks the inputs and gives the price without spending anything.
- **Say it.** Tell the person the price before you spend it. When the price is an estimate, say so.
- **Cap it.** Run it with `--max-credits` / `max_credits` set to the price you said; nothing starts above the cap.
- **Once only.** Pass `--idempotency-key` / `idempotency_key` on every generation, so a retry after a timeout finds the first run instead of paying twice.
- **Report it.** On delivery, say what you spent.
