# Lumen — personal dashboard & time-blocking planner

An aesthetic, single-page productivity dashboard. Live at **https://awe369.github.io/lumen-planner/**

## Features
- **Dashboard**: live clock, day & year progress, "happening now" block with countdown, today's agenda, focus tasks, 7-day focus chart, and monthly goals.
- **To-do list**: priorities, due dates, tags, time estimates, sub-steps, smart groups (Overdue / Today / Upcoming / Someday / Completed), undo, and one-click **auto-schedule** into free time.
- **Planner**: month calendar with events, a theme for each month and monthly goals. The year view shows 12 mini-calendars, yearly goals and year progress.
- **Time blocker**:
  - Day & week timelines. Drag on empty space to create a block, drag a block to move it (also across days in week view), and drag its bottom edge to resize. Times snap to a grid.
  - Categories with colours, and a per-category breakdown of planned, done and free time.
  - Repeating blocks (daily, weekdays, weekends, weekly). You can change the status of a single occurrence and choose whether a delete removes one occurrence, the following ones or the whole series.
  - Overlaps are detected: clashing blocks sit side by side and get a dashed outline.
  - Drag tasks onto the timeline. Blocks linked to a task complete the task when the block is done.
  - Day templates (save a day, apply it anywhere), copy the previous day, shift the remaining blocks when you're running late, and clear the day (with undo).
  - Live "now" line, a chime and an optional desktop notification when a block starts.
- **Focus mode**: a full-screen countdown for the current block (complete / +15 min / skip), or a free Pomodoro timer.
- Light and dark themes, accent colours, 12/24-hour clock, and JSON backup export/import.

## Keyboard
`1`–`4` switch views · `Q` quick add · `F` focus · in Time Blocks: `N` new block, `T` today, `←/→` move between days, `W` switch between day and week.

## Data
Everything is stored in your browser's `localStorage`. Nothing is sent anywhere. Use **Settings → Export backup** to keep a copy or move to another device.

No build step: open `index.html` or serve the folder.
