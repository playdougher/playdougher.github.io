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

We can configure environmental variables and shortcuts, manage windows, window groups and window layouts with .screenrc file.

## Usages

My daily use conifguration file:

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

### 

If you run Screen on a remote server and the TCP connection becomes unstable, Screen may get blocked. To recover from a blocked state after 1 second, set the following option:
```sh
nonblock 1
```

Change escape key because the default `^a` is often used in Bash, `^q` is quote insertion in Bash and Emacs and is rarely used, so it makes a good choice.
``` sh
escape ^q^q
```

Screen has the ability to create window groups, and group groups. It helps to organise windows well.
```sh
screen -t "root" //group
screen -t "two" //group
select 1
screen -T "screen-256color"
```

Set below option to name windows, so we can search window easily in window list.
```sh
defdynamictitle on
```

Turn off welcome page because it's useless.
```sh
startup_message off
```

Mouse track is useful when switch between many panes, but it doesn't work well on 2K monitors, so I disable it. I found the left most window is activated when I click the right most one.
```sh
mousetrack off
defmousetrack off
```

Hardstatus is useful to show window info or denote current active window.
```sh
hardstatus on
# rendition so =b wk
rendition so =b wk
# caption always "%?%F%{.B.}%? /%H /%S /%n /%t"
# caption always "%?%F%{.B.}%? /%H /%S /%n /%e"
caption always "%?%F%{kw}%? /%Y%m%d.%c:%s /%H /%S /%n /%e"
```

After exit Emacs or Vim, there will be residual content on screen, turn on option to clear them.
```sh
altscreen on #fix residual editor text
```

Long time message is annoying, I reduce it to 3 seconds.
```sh
# message display time (seconds)
msgwait 3
```

diable login makes not show login entry in `w`, it may look terrible for customers if I create dozens of terminal.
```sh
deflogin off
```

Set long scrollback buffer to contain more history info
```sh
defscrollback 5000
```

Make gnu screen support scroll with mouse
```sh
termcapinfo xterm*|rxvt*|kterm*|Eterm* ti@:te@
```

Specify term to enbale 256-color
```sh
terminfo rxvt-* 'Co#256:AB=\E[48;5;%dm:AF=\E[38;5;%dm'
term "screen-256color"
```

