---
title:      "the use of bashrc file"
date:       2024-07-18T19:57:19+08:00
tags:       ["bashrc"]
identifier: "20240718T195719"
layout: "layouts/post.njk"
eleventyNavigation:
  key: "the-use-of-bashrc-file"
  parent: Home
---

# The Use of Bashrc File

## Overview

The bashrc file is the startup file for interactive shells.

## Terminal Title

I use Xmonad as my tiling X11 window manager, and Rofi as window switcher, It's important to ensure each terminal has a different title for easier identification and switching. To achive this, I use `trap DEBUG` and manage different `TERM` variables to update terminal titles.
```sh
trap 'commandName=$(history 1| sed "s/^[ ]*[0-9]*[ ]*//g"); backspacedString="${commandName//\\/\\\\}"; echo -ne "\033]0;$HOSTNAME:$PWD \$ $backspacedString\007"' DEBUG
case "$TERM" in
    screen*)
      # update gnu screen title
      trap 'commandName=$(history 1| sed "s/^[ ]*[0-9]*[ ]*//g"); backspacedString="${commandName//\\/\\\\}"; TITLE="$HOSTNAME:$PWD \$ $backspacedString"; echo -ne "\033k$TITLE\033\0134"; echo -ne "\033P\033]0;$TITLE\007\033\\\\"' DEBUG 
    ;;
    tmux*)
    # trap 'commandName=$(history 1| sed "s/^[ ]*[0-9]*[ ]*//g"); backspacedString="${commandName//\\/\\\\}"; echo -ne "\033]2;$HOSTNAME:$PWD \$ $backspacedString\033\\"' DEBUG
    ;;
esac
```

## History Configuration

Configs below ignores duplicated commands in the history list, limits the number of command to 10000 and restrict the history file size to 10000 commands.
``` sh
HISTCONTROL=ignoreboth
HISTSIZE=10000
HISTFILESIZE=10000
```

Below appends history entries to file instead of overwrits it.
``` sh
shopt -s histappend
```

## Shell Notification

Function below will ring the bell for `$1` times, which is useful for notifying you when an SSH session finishes running a long job. 
``` sh
function bel {
  for i in $(seq 1 "$1"); do tput bel; done
}
```

It's used in combination with Urxvt terminal emulator's bell-command plugin, a `bellcatch.sh` script and [dunst](https://dunst-project.org/) notification daemon. Urxvt captures every bell and writes the parent process id to a file. The `bellcatch.sh` monitors this file and uses dunst to display a notification when it detects 6 continuous bells within 1 second. 6 bells helps avoid trggering notifications from occasional bell noise, such as when repeatedly typing `<C-u>` in Bash with no content.
``` sh
zhihao@dust|/home/zhihao/Downloads/playdougher.github.io|$ grep bell-co ~/.Xresources | grep -v "^!"
URxvt.perl-ext-common:          eval,selection,clipboard,bell-command,keyboard-select,-searchable-scrollback,-matcher,-selection-autotransform,-selection-popup,-selection-popup-mod,52-osc,confirm-paste
URxvt.bell-command: echo $PPID >> /tmp/pidddd
zhihao@dust|/home/zhihao/Downloads/playdougher.github.io|$
```

The bellcatch.sh script:
``` sh
zhihao@dust|/home/zhihao|$ cat bin/bellcatch.sh
#!/bin/bash
presi() {
  if [[ ! -e /tmp/pidddd ]]; then
    touch /tmp/pidddd
  fi
  if [[ ! -e /tmp/taskkkk ]]; then
    touch /tmp/taskkkk
  fi
  if [[ ! -e /tmp/pidddd2 ]]; then
    cp /tmp/pidddd /tmp/pidddd2
  fi
}
function notify_task {
  #set -x
  read -r ln processid <<< "$1"
  #set +x
  #commname=$(ps -p "$processid" -o comm=)
  winname=$(xdotool getwindowname $(xdotool search --pid "$processid"))
  #if [ -e /home/zhihao/Music/infographic-pop-7-197874.mp3 ]; then
  #  ffplay -v 0 -nodisp -autoexit /home/zhihao/Music/infographic-pop-7-197874.mp3 &>/dev/
null
  #fi
  ACTION=$(dunstify --action="default,0" --action="wait,1" -a bellcatch "$winname")
  case "$ACTION" in
    "default")
      sed -i "/^${ln}/d" /tmp/taskkkk

      switch2window.sh "$processid"
      ;;
    "wait")
      #wait_action
      :
      ;;
    "2")
      :
      #handle_dismiss
      ;;
    esac
}
function mon {

  while inotifywait -q -e close_write /tmp/pidddd; do
    sleep 0.5
    tsknum="$(wc -l /tmp/taskkkk | cut -d' ' -f 1)"
    export tsknum

    local changes="$(diff --changed-group-format='%<%>' --unchanged-group-format='' /tmp/p
idddd /tmp/pidddd2)"
    local fk="$(echo "$changes" | uniq -c)"
    local num=$(echo "$fk" | awk '{print $1}' | tail -n1)
    local processid=$(echo "$fk" | awk '{print $2}' | tail -n1)
    local datea=$(date +%Y%m%d.%H%M%S)
    echo "$fk"
    echo "$num"
    echo "$processid"
    if [[ "$num" == 6 ]]; then
      echo "$((tsknum+1)) $processid" >> /tmp/taskkkk
      notify_task "$((tsknum+1)) $processid" &

    fi
    cp /tmp/pidddd /tmp/pidddd2;
  done
}
presi
mon "$@"
zhihao@dust|/home/zhihao|$
```

The `cgrep` function is similar to `bel`, it is used to grep the process tree and select a process to notify when it finishes running.
``` sh
cgrep() {
    # Run the command and store the output in an array
    if [[ -z "$1" ]]; then
      echo "no matching"
      return 99
    fi
    pgoption=`pgrep -a 2>&1 | grep -q -- "invalid.* -- 'a'" && echo l  || echo a`
    tmpo="$(pgrep -f$pgoption "$1"| grep -v ${FUNCNAME[0]} | cut -c -80)"
    if [[ -z "$tmpo" ]]; then
      echo "no matching"
      return 98
    fi
    readarray -t output <<<"$tmpo"
    #echo "${output[@]}"
    #for key in "${!output[@]}"; do echo "${output[$key]}"; done
    # Display the output with an index
    #echo ${#output[@]}
    for i in "${!output[@]}"; do
        echo "$i: ${output[$i]}"
    done
#
#    # Prompt the user to choose an index
    [[ ${#output[@]} > 1 ]] && 
    read -p "entry to monitor:" index ||
    index=0

    # Validate the user's input
    if [[ $index =~ ^[0-9]+$ ]] && ((index >= 0 && index < ${#output[@]})); then
        chosen_pid=$(cut -d' ' -f1 <<<"${output[$index]}")
        #echo "You chose: $chosen_pid"
        #watch -n 1 -g "ps -p $chosen_pid --no-headers -o pid" && bel 6
        tail --pid $chosen_pid -f /dev/null && bel 6
    else
        echo "Invalid index. try again."
    fi
}
```

## Miscellaneous

Below disables flow control, so `<C-s>` won't cause the terminal to get stuck.
```sh
stty -ixon
```

Below resizes window after each command runs.
``` sh
shopt -s checkwinsize
```

Create an Emacs alias that quickly starts a terminal-based Emacs and will create an Emacs daemon if it's not already running. The Emacs daemon can significantly speed up Emacs startup time.
``` sh
alias emacs="emacsclient -ct -a ''"
```

Setting default EDITOR and VISUAL allows you to edit or view long or complex commands with Emacs in shell, e.g. use `<C-x><C-e>` to open the current command in Emacs.
```sh
export EDITOR="emacsclient -ct -a ''"
export VISUAL="emacsclient -ct -a ''"
```

`$PROMPT_COMMAND` is executed each time before a command is run in the shell, I use it to append each command to the history file, in case the history is lost if the computer is accidently turned off.
``` sh
export PROMPT_COMMAND="history -a"
```

I use fasd to quickly switch between directories, initiate `fasd` with below command.
```sh
eval "$(fasd --init auto)"
```

Set `MAN_POSIXLY_CORRECT` to show only the first man page when multiple man pages are available.
```sh
export MAN_POSIXLY_CORRECT=true
```

