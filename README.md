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
- **Habit tracker**:
  - Habit types: yes/no, count (glasses, pages…) and timed (minutes).
  - Schedules: every day, specific weekdays, or X times per week.
  - Habits are grouped by time of day and life area, with an optional reminder for each one.
  - You can check in for any day of the current week. Skipping a day keeps your streak, and each day can have a note.
  - Stats for each habit: current and best streak, 30- and 90-day rates, and a *habit strength* score. Strength is a moving average that rewards consistency and forgives a single miss.
  - Three views: Check-in, a 28-day **grid**, and **Insights** (a year heatmap, a 60-day trend, your best weekdays and a leaderboard). Each habit also has a detail page with a 6-month heatmap, strength over time and a weekday breakdown.
- **Sleep tracker**:
  - Live tracking: tap **Going to bed**, then **I'm awake**. You can also log nights manually: bedtime, wake time, how long it took to fall asleep, times you woke up, quality, energy on waking, factors (caffeine, exercise, screens…) and dream notes.
  - A 0–100 sleep score built from duration vs. goal, quality, timing and disruptions. Also: efficiency, 7-day sleep debt, a consistency score and your chronotype.
  - Charts: sleep windows against your goal window, hours asleep vs. goal, *what affects your sleep* (score with vs. without each factor), weekday averages and a 6-month score calendar. It also writes insights for you, such as social jet lag and your best and worst factors.
  - A wind-down reminder 30 minutes before your bedtime.
- **Focus mode**: a full-screen countdown for the current block (complete / +15 min / skip), or a free Pomodoro timer.
- Light and dark themes, accent colours, 12/24-hour clock, and JSON backup export/import.

## Keyboard
`1`–`6` switch views · `Q` quick add · `F` focus · in Time Blocks: `N` new block, `T` today, `←/→` move between days, `W` switch between day and week.

## Data
Everything is stored in your browser's `localStorage`. Nothing is sent anywhere. Use **Settings → Export backup** to keep a copy or move to another device.

No build step: open `index.html` or serve the folder.
