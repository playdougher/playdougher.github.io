---
title:      "the use of .screenrc file"
date:       2024-07-19T11:07:17+08:00
tags:       ["screenrc"]
identifier: "20240719T110717"
layout: "layouts/post.njk"
eleventyNavigation:
  key: "the-use-of-screenrc-file"
  parent: Home    
---

# The Use of .screenrc File

## Overview 

We can use the .screenrc file to configure environmental variables and shortcuts, manage windows, window groups and window layouts.

## Usages

My daily conifguration file:

``` sh
##resize max
defutf8 on
defencoding utf8
encoding UTF-8 UTF-8
setenv DISPLAY :0
    
nonblock 1
escape ^q^q
shell "/var/tmp/.scbash"

layout save 0

screen -t "root" //group
screen -t "two" //group
select 1
screen -T "screen-256color"
# screen bash --rcfile $HOME/.sptzh/.ssh-bashrc
# stuff "^j"

vbell off
# layout save def
# setenv BASH_ENV /path/to/custom_bashrc
# verbose on
attrcolor b ".I" # use bright colors for bold
defdynamictitle on
startup_message off
mousetrack off
defmousetrack off
hardstatus on
# rendition so =b wk
rendition so =b wk
# caption always "%?%F%{.B.}%? /%H /%S /%n /%t"
# caption always "%?%F%{.B.}%? /%H /%S /%n /%e"
caption always "%?%F%{kw}%? /%Y%m%d.%c:%s /%H /%S /%n /%e"
# caption always "%A||%B||%C||%D||%E||%F||%G||%H||%I||%J||%K||%L||%M||%N||%O||%P||%Q||%R||%S||%T||%U||%V||%W||%X||%Y||%Z||%a||%b||%c||%d||%e||%f||%g||%h||%i||%j||%k||%l||%m||%n||%o||%p||%q||%r||%s||%t||%u||%v||%w||%x||%y||%z"
#caption always "%s||%t||%u||%v||%w||%x||%y||%z"

# show window list in the buttom
# caption always "%{= kw}%-Lw%{= BW}%50>%n%f* %t%{= kw}%+Lw%< %{= kw}[Load:%{= Y}%D%{= kw}]%{= BW}%=%{= kw}%h/%H"
# caption always "%{= Wk}%-Lw%50>%{= BW}%n%f* %t%{= Wk}%+Lw%<"    

#hardstatus alwayslastline
#hardstatus string " %H %S %n %t "
#caption always "%{= kw}%-w%{= gW}%n %t%{-}%+w %-= bigdatums.net - %Y-%m-%d %C:%s"
altscreen on #fix residual editor text

# message display time (seconds)
msgwait 3

deflogin off

# enable logging
# deflog on
# set log location
# logfile /root/screen.%n		

# nethack off			# nethack like notifications

# backtick 0 3600 3600 printf "$USER"
# backtick 1 5 5 /bin/bash -c 'cpuLoad=$(cut -s -d\  -f13 <(uptime)); cpuLoad=${cpuLoad:0:-1}; memLoad=...; echo "CPU load ${cpuLoad} Mem Load ${memLoad}" '

multiuser on 
# addacl test1,test2

# huge scrollback buffer
defscrollback 5000

# diable welcome message
startup_message off

# scroll with mouse
termcapinfo xterm*|rxvt*|kterm*|Eterm* ti@:te@

# Change the xterm initialization string from is2=\E[!p\E[?3;4l\E[4l\E>
# (This fixes the "Aborted because of window size change" konsole symptoms found
#  in bug #134198)
# termcapinfo xterm* 'is=\E[r\E[m\E[2J\E[H\E[?7h\E[?1;4;6l'
terminfo rxvt-* 'Co#256:AB=\E[48;5;%dm:AF=\E[38;5;%dm'
# term "rxvt-256color"
# term "xterm-256color"
term "screen-256color"

# layouts
layout new two
select 2
layout save two

bind ' ' layout next # <- actually means Ctrl-q + Space
# bind ^o focus next
bind ^u focus prev
bind ^g 
bind "|" eval "split -v" "windowlist -b" "other" "focus" "other" "screen"
bind "S" eval "split" "windowlist -b" "other" "focus" "other" "screen"
bindkey "^q^o" eval "focus next" "focus next"
bindkey "^q^y" eval "focus prev" "focus prev"
# bindkey "^q^r" eval "layout save tmp" "only"
bindkey "^q^j" other
# bind "r" eval "layout save tmp" "only"
bind "r" eval "resize _" "fit" "colon" "stuff 'resize -b ='"
# bind "3" eval "layout select three"
bind "\"" select
# bind "u" eval "layout show"
bind s eval "colon" "stuff 'layout save '"
bindkey "^q^m" layout select
bind "m" layout show
# bind \' eval "windowlist -m" "stuff j"
bind \' eval "windowlist -m"
# bind g eval "screen //group" "title" "screeen"
# bind g eval "windowlist -g -m" "stuff ^?" "screen //group" "title" "stuff ^u" 
bind g eval "windowlist -g -m" "stuff ^?" "screen //group" "colon" "stuff 'eval \"title \" \"screen\" \"only\" \"layout save '" "stuff ^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b"
# bind C stuff "sudo -E bash --rcfile $(getent passwd $(ls /tmp/.scfile/) | cut -d: -f6)/.sptzh/.ssh-bashrc\n"
bind "?" eval "select root" "windowlist -g -m" "stuff /"
bind "/" eval "windowlist -g -m" "stuff j/"
# map to return
# bindkey -m "^[l" eval "stuff \015"
bindkey -m "^[j" eval "stuff jjj"
bindkey -m "^[k" eval "stuff kkk"

# bindkey -m "'" select
# bind "h" at \# stuff ". ~/.sptzh/.ssh-bashrc\n" 

# sync screen buffer to clipboard
# bindkey -m > eval "stuff ' '" writebuf "exec sh -c 'xsel -ip < /tmp/screen-exchange'"
# bindkey -m > eval "stuff ' '" writebuf "!.. /bin/bash -cx 'printf \"\\033]52;c;\$(printf \"Hello, world\" | base64)\\a\"' | less"
# bindkey -m > eval "stuff ' '" writebuf "exec /bin/bash -c 'printf \"\\033P\\033]52;c;\$(cat /tmp/screen-exchange)\\a\\033\\\\\\\\\"'"
bindkey -m > eval "stuff ' '" writebuf "exec bash -c '$(getent passwd $(cat /var/tmp/.scuser) | cut -d: -f6)/.sptzh/osc52.sh < /tmp/screen-exchange'"
# bindkey -m > eval "stuff ' '" writebuf "exec /bin/bash -cx 'echo xxx$SHELL xx $TERM'"

bind "j" eval "copy" "stuff ' H ' " writebuf "exec bash -c '$(getent passwd $(cat /var/tmp/.scuser) | cut -d: -f6)/.sptzh/osc52.sh < /tmp/screen-exchange'"

# update appearance of horizental or vertical bar
# caption string "%{11} "
# caption string "%{00}%3n %t"
# rendition so =01

# make title follow commnad executed
# windowlist string "%4n %h%=%f"

# shelltitle '$ |something'
maptimeout 100
layout attach :last
layout autosave on

```

### Layout and Groups Management

Screen has the ability to create window groups, and nested groups, helping to organise windows efficiently.
```sh
screen -t "root" //group
screen -t "two" //group
select 1
screen -T "screen-256color"
```

Screen doesn't have command to switch window groups directly, but it can be done indirectly using layout. If you create a layout named "two" and configure it with `screen -t "two" //group`, you can switch to group "two" using the layout command `layout select two`.
```
layout new two
select 2
layout save two
```

You can create a new layout, select and display layouts.
```sh
bind s eval "colon" "stuff 'layout save '"
bindkey "^q^m" layout select
bind "m" layout show
```

To create a new window group, type the group name in palce of the two "_" cursor positions and add a `"` in the end of the command: `:eval "title _" "screen" "only" "layout save _"`.
```sh
bind g eval "windowlist -g -m" "stuff ^?" "screen //group" "colon" "stuff 'eval \"title \" \"screen\" \"only\" \"layout save '" "stuff ^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b^b"
```

Save the layout when detaching Screen to recover the previous layout when reattaching.
```sh
layout attach :last
layout autosave on
```

### Window Management

Set the following option to name windows dynamically, making it easier to search for them easily in the window list.
```sh
defdynamictitle on
```

Using only one region in a Screen window wastes space. Typically I create at least 3 regions, sometimes even 6. To switch between them fluently, I use `<C-q><C-u>` and `<C-q><C-i>` to select previous and next region. I also create shortcuts to move two region at a time which is efficient when working with 6 regions.
```sh
bind ^u focus prev
bindkey "^q^o" eval "focus next" "focus next"
bindkey "^q^y" eval "focus prev" "focus prev"
```

Using two different characters to trigger a command is quicker.
```sh
bindkey "^q^j" other
```

Regions are initially split with blank content, but we usually create a window in it. Use shortcuts to replace the default ones.
```sh
bind "|" eval "split -v" "windowlist -b" "other" "focus" "other" "screen"
bind "S" eval "split" "windowlist -b" "other" "focus" "other" "screen"
```

Sometimes a region is too small, to temporarily maximise it, use the shortcut below, then `<C-M>` to restore.
```sh
bind "r" eval "resize _" "fit" "colon" "stuff 'resize -b ='"
```

You can display window list of current window group in the order of most recently used.
```sh
bind "\"" select
bind \' eval "windowlist -m"
```

You can search windows by name. The first line searches within the current group, while the second searches across all groups.
```sh
bind "/" eval "windowlist -g -m" "stuff j/"
bind "?" eval "select root" "windowlist -g -m" "stuff /"
```

You can use `<M-j>` and `<M-k>` to move quickly through the window group list.
```sh
bindkey -m "^[j" eval "stuff jjj"
bindkey -m "^[k" eval "stuff kkk"
```

### Navigation Bar

Hardstatus is useful for displaying the window infomation or indicating the currently active window.
```sh
hardstatus on
# rendition so =b wk
rendition so =b wk
# caption always "%?%F%{.B.}%? /%H /%S /%n /%t"
# caption always "%?%F%{.B.}%? /%H /%S /%n /%e"
caption always "%?%F%{kw}%? /%Y%m%d.%c:%s /%H /%S /%n /%e"
```

After exiting Emacs or Vim, Residual content may remain on the screen, enable the option to clear them.
```sh
altscreen on #fix residual editor text
```

### System Clipboard

You can copy highlighted content to clipboard, even it's in a remote SSH connection.
```sh
bindkey -m > eval "stuff ' '" writebuf "exec bash -c '$(getent passwd $(cat /var/tmp/.scuser) | cut -d: -f6)/.sptzh/osc52.sh < /tmp/screen-exchange'"
```

osc52.sh:
```sh
#!/bin/sh
# Copyright (c) 2012 The Chromium OS Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# Max length of the OSC 52 sequence.  Sequences longer than this will not be
# sent to the terminal.
OSC_52_MAX_SEQUENCE="100000"

# Write an error message and exit.
# Usage: <message>
die() {
  echo "ERROR: $*"
  exit 1
}

# Send a DCS sequence through tmux.
# Usage: <sequence>
tmux_dcs() {
  printf '\033Ptmux;\033%s\033\\' "$1"
}

# Send a DCS sequence through screen.
# Usage: <sequence>
screen_dcs() {
  # Screen limits the length of string sequences, so we have to break it up.
  # Going by the screen history:
  #   (v4.2.1) Apr 2014 - today: 768 bytes
  #   Aug 2008 - Apr 2014 (v4.2.0): 512 bytes
  #   ??? - Aug 2008 (v4.0.3): 256 bytes
  # Since v4.2.0 is only ~4 years old, we'll use the 256 limit.
  # We can probably switch to the 768 limit in 2022.
  local limit=256

  if [ "$2" -eq "1" ]; then
    # We go 4 bytes under the limit because we're going to insert 2 bytes
    # before (\eP) and 2 bytes after (\e\) each string.
    echo -n "$1" | \
      sed -E "s:.{$(( limit - 4 ))}:&\n:g" | \
      sed -E -e 's:^:\x1bP:' -e 's:$:\x1b\\:' | \
      tr -d '\n'
  elif [ "$2" -eq "2" ]; then
    # We go 10 bytes under the limit because we're going to insert 4 bytes
    # before (\eP\eP) and 6 bytes after (\e\) each string.
    echo -n "$1" | \
      sed -E "s:.{$(( limit - 10 ))}:&\n:g" | \
      sed -E -e 's:^:\x1bP\x1bP:' -e 's:$:\x1b\x1b\\\x1b\\\\:' | \
      tr -d '\n'
  fi
}

# Send an escape sequence to hterm.
# Usage: <sequence>
print_seq() {
  local seq="$1"

  case ${TERM-} in
  screen*)
    # Since tmux defaults to setting TERM=screen (ugh), we need to detect
    # it here specially.
    if [ -n "${TMUX-}" ]; then
      tmux_dcs "${seq}"
    else
      screen_dcs "${seq}" "${SCREEN_LEVEL:-1}"
    fi
    ;;
  tmux*)
    tmux_dcs "${seq}"
    ;;
  *)
    echo -n "${seq}"
    ;;
  esac
}

# Base64 encode stdin.
b64enc() {
  base64 | tr -d '\n'
}

# Send the OSC 52 sequence to copy the content.
# Usage: [string]
copy() {
  local str

  if [ $# -eq 0 ]; then
    str="$(b64enc)"
  else
    str="$(echo "$@" | b64enc)"
  fi

  if [ ${OSC_52_MAX_SEQUENCE} -gt 0 ]; then
    local len=${#str}
    if [ ${len} -gt ${OSC_52_MAX_SEQUENCE} ]; then
      die "selection too long to send to terminal:" \
        "${OSC_52_MAX_SEQUENCE} limit, ${len} attempted"
    fi
  fi

  print_seq "$(printf '\033]52;c;%s\a' "${str}")"
}

# Write tool usage and exit.
# Usage: [error message]
usage() {
  if [ $# -gt 0 ]; then
    exec 1>&2
  fi
  cat <<EOF
Usage: osc52 [options] [string]

Send an arbitrary string to the terminal clipboard using the OSC 52 escape
sequence as specified in xterm:
  https://invisible-island.net/xterm/ctlseqs/ctlseqs.html
  Section "Operating System Controls", Ps => 52.

The data can either be read from stdin:
  $ echo "hello world" | osc52.sh

Or specified on the command line:
  $ osc52.sh "hello world"

Options:
  -h, --help    This screen.
  -f, --force   Ignore max byte limit (${OSC_52_MAX_SEQUENCE})
EOF

  if [ $# -gt 0 ]; then
    echo
    die "$@"
  else
    exit 0
  fi
}

main() {
  set -e

  while [ $# -gt 0 ]; do
    case $1 in
    -h|--help)
      usage
      ;;
    -f|--force)
      OSC_52_MAX_SEQUENCE=0
      ;;
    -*)
      usage "Unknown option: $1"
      ;;
    *)
      break
      ;;
    esac
    shift
  done

  copy "$@"
}
main "$@"
```

You can copy content from cursor position to the top of a terminal quickly to clipboard using the following shortcuts.
```sh
bind "j" eval "copy" "stuff ' H ' " writebuf "exec bash -c '$(getent passwd $(cat /var/tmp/.scuser) | cut -d: -f6)/.sptzh/osc52.sh < /tmp/screen-exchange'"
```

### Miscellaneous

Change the escape key because the default `^a` is often used in Bash, while `^q` is used for quote insertion in Bash and Emacs and is rarely needed, so it's a good choice to use `^q`.
``` sh
escape ^q^q
```

If you run Screen on a remote server and the TCP connection becomes unstable, Screen may get blocked. To recover from a blocked state after 1 second, set the following option:
```sh
nonblock 1
```

Set long scrollback buffer to retain more history information.
```sh
defscrollback 5000
```

Enable mouse support in GNU Screen.
```sh
termcapinfo xterm*|rxvt*|kterm*|Eterm* ti@:te@
```

Specify the terminal type to enbale the 256-color support.
```sh
terminfo rxvt-* 'Co#256:AB=\E[48;5;%dm:AF=\E[38;5;%dm'
term "screen-256color"
```

Turn off the welcome page.
```sh
startup_message off
```

Mouse track is useful when switching between many regions, but it doesn't work well on 2K monitors, so I disable it. I found that clicking the right-most window activates the left most one, which is incorrect.
```sh
mousetrack off
defmousetrack off
```

Showing message for long time is annoying, so I reduce it to 3 seconds.
```sh
# message display time (seconds)
msgwait 3
```

Diable login to prevent entries from appearing in the `w` command output. This can avoid causing concern for customers if there are many login terminals.
```sh
deflogin off
```

I unbind ^g to avoid accidentally switching to vbell mode when using Emacs.
```sh
bind ^g 
```

Shorten the delay between inputs when using escape sequence.
```sh
maptimeout 100
```

## Other Resources

I get osc52.sh from [https://chromium.googlesource.com/apps/libapps/+/master/nassh/doc/FAQ.md#Is-OSC-52-aka-clipboard-operations_supported](https://chromium.googlesource.com/apps/libapps/+/master/nassh/doc/FAQ.md#Is-OSC-52-aka-clipboard-operations_supported).
