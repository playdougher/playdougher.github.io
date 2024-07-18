---
title:      "the use of .inputrc file"
date:       2024-07-15T22:45:40+08:00
tags:       ["inputrc"]
identifier: "20240715T224540"
layout: "layouts/post.njk"
eleventyNavigation:
  key: 
  parent: LFS project appnote
---

## Overview 

.inputrc file is init file of readline library, we can custmize shortcuts to make terminal more useful and productive.

## Usages for .inputrc file

File below shows my daily use config. We can check all shortcuts current shell uses with `bind -p`, show all options we enabled with `bind -v`
```sh
zhihao@dust|/home/zhihao|$ grep -vE "^(#|$)" .inputrc
"\C-o": menu-complete
"\C-x\C-o": menu-complete-backward
set show-all-if-ambiguous on
set colored-stats On
set visible-stats On
set mark-symlinked-directories On
set colored-completion-prefix On
set menu-complete-display-prefix off
set revert-all-at-newline on
set page-completions off
"\C-p": history-search-backward
"\C-n": history-search-forward
"\C-xz": "sudo -E bash --rcfile ~/.sptzh/.ssh-bashrc\n"
"\e\C-p": history-substring-search-backward
"\e\C-n": history-substring-search-forward
set skip-completed-text on
set completion-prefix-display-length 0
"\e\C-b": shell-backward-word
"\e\C-f": shell-forward-word
"\e\C-d": shell-kill-word
"\eh": shell-backward-kill-word
"\e[7~": beginning-of-line
"\e[8~": end-of-line
zhihao@dust|/home/zhihao|$
zhihao@dust|/home/zhihao|$ bind -p | head

"\C-g": abort
"\C-x\C-g": abort
"\e\C-g": abort
"\C-j": accept-line
"\C-m": accept-line
# alias-expand-line (not bound)
# arrow-key-prefix (not bound)
# backward-byte (not bound)
"\C-b": backward-char
zhihao@dust|/home/zhihao|$ bind -v | head
set bind-tty-special-chars on
set blink-matching-paren on
set byte-oriented off
set colored-completion-prefix on
set colored-stats on
set completion-ignore-case on
set completion-map-case off
set convert-meta off
set disable-completion off
set echo-control-characters on
zhihao@dust|/home/zhihao|$
```

### better completion

Menu-complete can select a completion entry in order, which helps to quickly select an entry when there are not many completions. I often use menu-complete together with `fasd` to quickly access directories from my command line history.  
Menu-complete-backward is like menu-complete, but selects in reverse order, which is useful for quickly selecting the lastest log entry.
``` shell
"\C-o": menu-complete 
"\C-x\C-o": menu-complete-backward
```
Example of menu-complete:
```shell
bash-5.2# ls Xorg.<C-o>
Xorg.0.log      Xorg.0.log.old  Xorg.1.log      Xorg.1.log.old  Xorg.2.log      Xorg.2.log.old
bash-5.2# ls Xorg.0.log
```

Example of menu-complete-backward:
```shell
bash-5.2# ls Xor<C-i>
Xorg.0.log      Xorg.0.log.old  Xorg.1.log      Xorg.1.log.old  Xorg.2.log      Xorg.2.log.old
bash-5.2# ls Xorg.<C-x><C-o>
Xorg.0.log      Xorg.0.log.old  Xorg.1.log      Xorg.1.log.old  Xorg.2.log      Xorg.2.log.old
bash-5.2# ls Xorg.2.log.old
```

Show-all-if-unmodified and show-all-if-ambiguous options help to use word completion efficiently.

When these two options are off, as line 6-7 shows, `<C-i>` will make "f" partial completes to "file", and `<C-i><C-i>` will list matches.
```sh
zhihao@dust|/home/zhihao/Downloads/aa|$ bind -v | grep show-all
set show-all-if-ambiguous off
set show-all-if-unmodified off
zhihao@dust|/home/zhihao/Downloads/aa|$ ls<C-m>
file1  file2  file3
zhihao@dust|/home/zhihao/Downloads/aa|$ ls f<C-i>
zhihao@dust|/home/zhihao/Downloads/aa|$ ls file<C-i><C-i>
file1  file2  file3  
zhihao@dust|/home/zhihao/Downloads/aa|$ ls file
```

When show-all-if-unmodified option is on, only one `<C-i>` in line 7 is needed to list matches.
```sh
zhihao@dust|/home/zhihao/Downloads/aa|$ bind -v | grep show-all
set show-all-if-ambiguous off
set show-all-if-unmodified on
zhihao@dust|/home/zhihao/Downloads/aa|$ ls<C-m>
file1  file2  file3
zhihao@dust|/home/zhihao/Downloads/aa|$ ls f<C-i>
zhihao@dust|/home/zhihao/Downloads/aa|$ ls file<C-i>
file1  file2  file3  
zhihao@dust|/home/zhihao/Downloads/aa|$ ls file
```

When show-all-if-ambiguous option is on, only one `<C-i>` will perform partial completion and list matches 
```sh
zhihao@dust|/home/zhihao/Downloads/aa|$ bind -v | grep show-all
set show-all-if-ambiguous on
set show-all-if-unmodified off
zhihao@dust|/home/zhihao/Downloads/aa|$ ls f<C-i>
file1  file2  file3  
zhihao@dust|/home/zhihao/Downloads/aa|$ ls file
```

Set menu-complete-display-prefix to off can avoid showing common prefix and directly select the first match.
```sh
zhihao@dust|/home/zhihao/Downloads/aa|$ bind -p | grep menu-complete$
"\C-o": menu-complete
zhihao@dust|/home/zhihao/Downloads/aa|$ bind -v | grep menu-complete-display-prefix
set menu-complete-display-prefix off
zhihao@dust|/home/zhihao/Downloads/aa|$ ls f<C-o>
fa/    fb/    file1  file2  file3  file4  
zhihao@dust|/home/zhihao/Downloads/aa|$ ls fa/
```

Set page-completions off can avoid using 'more' like pager to show completions, use pager will interrupt the coherence of the input.

Skip-completed-text will be active when perform completion in the middle of word, it will skip characters that duplicate with completion, like cursor '_' in Down_loads will generate Downloads_, not Downloadsloads_.

Completion-prefix-display-length default value is 0, I just check what will happen when use value larger than 0. Test is as follows:

The value is 3, length of common prefix "file" is 4, so it will output ... . Set value to 0 shows the full file name.
``` sh
zhihao@dust|/home/zhihao/Downloads/aa|$ bind -v | grep display-leng
set completion-prefix-display-length 3
zhihao@dust|/home/zhihao/Downloads/aa|$ ls file*
file1  file2  file3  file4
zhihao@dust|/home/zhihao/Downloads/aa|$ ls fi<C-i>
...1  ...2  ...3  ...4  
zhihao@dust|/home/zhihao/Downloads/aa|$ ls file
zhihao@dust|/home/zhihao/Downloads/aa|$ bind -v | grep display-leng
set completion-prefix-display-length 0
zhihao@dust|/home/zhihao/Downloads/aa|$ ls fi
file1  file2  file3  file4  
zhihao@dust|/home/zhihao/Downloads/aa|$ ls file
```

### better cursor movement

Shell-backward-word and shell-forward-word can move cursor '\_' from `ls a/b/c/d/e_` to `ls _a/b/c/d/e`, but backward-word(<M-b>) and forward-word(<M-f>) can only move cursor '\_' from `ls a/b/c/d/e_` to `ls a/b/c/d/_e`.

Shell-kill-word and shell-backward-kill-word can kill 'a/_b/c abc' to 'a/_ abc', kill-word(<M-d>) can only kill to 'a/_/c abc' 

Beginning-of-line and end-of-line make <Home> and <End> work as expected instead of generate ~.

### better looking

Colored-stats enable color for different file types, visible-stats appends a character to denote a file's type.  
Mark-symlinked-directories will add trailing '/' to completed symlinks which link to directories.
Colored-completion-prefix colors common prefix of completions.

### better history

Set revert-all-at-newline to on can avoid to modify history list by mistake.  
when revert-all-at-newline is off, we can modify history list, and there will be a * sign before command if it was modified, like line 25. To test it, We `<C-r>` to search history, type `ooo` to modify history, `<M-S-.>` to move to end of command history (currently being input command), check history again, we see 4 becomes `ooo4`.
```sh
zhihao@dust|/home/zhihao/Downloads/aa|$ 1
-bash: 1: command not found
zhihao@dust|/home/zhihao/Downloads/aa|$ 2
-bash: 2: command not found
zhihao@dust|/home/zhihao/Downloads/aa|$ 3
-bash: 3: command not found
zhihao@dust|/home/zhihao/Downloads/aa|$ 4
-bash: 4: command not found
zhihao@dust|/home/zhihao/Downloads/aa|$ 5
-bash: 5: command not found
zhihao@dust|/home/zhihao/Downloads/aa|$ 6
-bash: 6: command not found
zhihao@dust|/home/zhihao/Downloads/aa|$ history 7
10204  1
10205  2
10206  3
10207  4
10208  5
10209  6
10210  history 7
zhihao@dust|/home/zhihao/Downloads/aa|$ <C-r>4<C-j>ooo<M-S-.>history 7<C-j>
10204  1
10205  2
10206  3
10207* ooo4
10208  5
10209  6
10210  history 7
zhihao@dust|/home/zhihao/Downloads/aa|$
```
when revert-all-at-newline is on, the * line will be like what it was.
```sh
zhihao@dust|/home/zhihao/Downloads/aa|$ <C-r>4<C-j>ooo<M-S-.>history 7<C-j>
10204  1
10205  2
10206  3
10207  4
10208  5
10209  6
10210  history 7
zhihao@dust|/home/zhihao/Downloads/aa|$
```

History-search-backward and history-search-forward can search history for entries whose strings begin with what you type.

``` sh
zhihao@dust|/home/zhihao|$ history 5
 9990  aaaaaaaaaaaaaaaaa
 9991  bbbbbbbbbbbbbbbbb
 9992  ccccccccccccccccc
 9993  history
 9994  history 5
zhihao@dust|/home/zhihao|$ b<C-p>
zhihao@dust|/home/zhihao|$ bbbbbbbbbbbbbbbbb
```

History-substring-search-backward and history-substring-search-forward can search history for entries that have a substring of your input

``` sh
zhihao@dust|/home/zhihao|$ history 5
 9920  man bash
 ...
 9990  aaaaaaaaaaaaaaaaa
 9991  bbbbbbbbbbbbbbbbb
 9992  ccccccccccccccccc
 9993  history
 9994  history 5
zhihao@dust|/home/zhihao|$ b<C-M-p><C-M-p>
zhihao@dust|/home/zhihao|$ man bash
```

## Other Resources

- Check info page `info readline`
- Check man page `man bash`
- [https://wiki.archlinux.org/title/Readline](https://wiki.archlinux.org/title/Readline)

