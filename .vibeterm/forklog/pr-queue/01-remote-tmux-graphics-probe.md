# 01 - Kitty graphics query in the tmux pane title behind ssh

Status: MERGED upstream 2026-11-16T07:49:19Z as [anomalyco/opentui#2143](https://github.com/anomalyco/opentui/pull/2143), merged by simonklee from final head `5c00007e` into `main` as `c3a007e0` ("native: detect tmux in auto-detected remote sessions (#2143)"). Filed 2026-11-15 by coordinator [ses_ef8235798ffejGr4sa22eXmVNv](https://portal.vibeterm.desktop.ts.nowaker.net/session/ses_ef8235798ffejGr4sa22eXmVNv) with head `0e7aa146` on base `main` `e477ffa3`.

- Upstream releases containing `c3a007e0`: `v0.9.1` and `v0.9.2` (checked 2026-11-17 with `git tag --contains`).
- Fork follow-up: drop fork commit `f25ffe29` at the next rebase of `main-nowaker` onto an upstream release that contains `c3a007e0` (`v0.9.1` or later). Its Zellij detection is not part of the upstream merge, so check Zellij behavior before dropping it; if it is still needed, keep only that part.

- Repository and base: `anomalyco/opentui`, `main` at `e477ffa3` (#2140, after v0.9.0).
- Head: `Nowaker:fix/remote-tmux-graphics-probe`, `0e7aa146`, one commit above the base (rebased from `212802d2` on 2026-11-15; `0c48678d..e477ffa3` touches none of its three files).
- Fork commit: `main-nowaker` `f25ffe29` (the same fix on the fork's v0.6.0 base, which also covers Zellij and keeps the pre-#1961 structure).
- Related: closed issue #334 (the same title leak without ssh) and #1961 (screen detection behind ssh, whose table this PR extends).
- Source session: [ses_e215062b9ffe020IfGlqnRnuPu](https://portal.vibeterm.desktop.ts.nowaker.net/session/ses_e215062b9ffe020IfGlqnRnuPu); defect found by [ses_e2562f980ffe48VSWDL6KYVPBb](https://portal.vibeterm.desktop.ts.nowaker.net/session/ses_e2562f980ffe48VSWDL6KYVPBb).
- Re-checked at `e477ffa3` on 2026-11-15: with main's `terminal.zig` the table fails at row 6 (the graphics query is sent), and a library built from main leaks the title on a real tmux. If `main` moves again before filing, repeat both and rebase.

## Title

`native: detect tmux in auto-detected remote sessions`

## Upstream body

<!-- BEGIN PR BODY -->
If you start a tmux server from an ssh login, every pane inherits `SSH_CONNECTION`. An OpenTUI app in such a pane, opencode for example, then runs in auto-detected remote mode, and its pane title changes to `Gi=31337,s=1,v=1,a=q,t=d,f=24;AAAA` as soon as it starts. The same happens when you run an app over ssh from inside a tmux on your own machine. This is the leak from #334, now behind ssh.

In auto remote mode OpenTUI detects only GNU screen from the environment (#1961) and leaves tmux to its XTVERSION reply. But `queryTerminalSend` writes the Kitty graphics query in the same startup batch as XTVERSION, before any reply can arrive. So tmux is still `none` at that point, gets the query unwrapped, and sets it as the pane title.

With this change `TMUX`, or a `TERM` that starts with `tmux`, selects tmux in auto remote mode too. `TMUX` comes from a tmux on the server, whose panes receive the output, and a `tmux` `TERM` comes from a tmux on the client, which the output passes through. The check runs after the screen check, so a remote session with both `STY` and `TMUX` still counts as screen. Zellij keeps its XTVERSION detection. The alacritty `TERM` check and the other identity keys still apply only locally. The width method becomes wcwidth and clipboard writes use tmux framing, as with a local `TMUX`; OSC 52 support is still decided by the terminal's replies, as in other remote sessions.

The multiplexer table in `terminal_test.zig` gets three ssh tmux rows: `TMUX`, a `tmux-256color` `TERM`, and a `screen-256color` `TERM` with `TMUX`. They expect tmux, no Kitty graphics query, and tmux clipboard framing. Without the fix they send the graphics query and stay at `none`. The terminal capabilities reference lists tmux among the remote exceptions.

Verification:

- `bun run test:native` from `packages/core`: 2209 pass, 8 skipped. The filtered table fails on main.
- A real tmux 3.7c server on a throwaway socket, with `-f /dev/null` and with a full user config: an app built from this branch with `SSH_CONNECTION` set keeps the pane title it had. The same app built from main sets the title to `Gi=31337,...`. Without `SSH_CONNECTION`, both keep the title.

This PR is AI generated, but under direct supervision and on request of @Nowaker.
<!-- END PR BODY -->
