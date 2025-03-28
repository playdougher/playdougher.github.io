---
title:      "LFS project appnote"
date:       2024-04-21T18:57:48+08:00
tags:       ["appnote", "lfs"]
identifier: "20240421T185748"
layout: "layouts/post.njk"
eleventyNavigation:
  key: "LFS project appnote"
  parent: Home
---
## 1. Introduction

LFS helps to build a custom Linux distribution from scratch.

## 2. Preparing the Host System

### 2.2 Host System Requirements

#### 2.2.2 Software Requirements

Check software requirements with version-check.sh.
```bash
zhihao@dust|/home/zhihao/Downloads|$ cat version-check.sh
#!/bin/bash
# A script to list version numbers of critical development tools
# If you have tools installed in other directories, adjust PATH here AND
# in ~lfs/.bashrc (section 4.4) as well.
LC_ALL=C
PATH=/usr/bin:/bin
bail() { echo "FATAL: $1"; exit 1; }
grep --version > /dev/null 2> /dev/null || bail "grep does not work"
sed '' /dev/null || bail "sed does not work"
sort   /dev/null || bail "sort does not work"
ver_check()
{
   if ! type -p $2 &>/dev/null
   then
     echo "ERROR: Cannot find $2 ($1)"; return 1;
   fi
   v=$($2 --version 2>&1 | grep -E -o '[0-9]+\.[0-9\.]+[a-z]*' | head -n1)
   if printf '%s\n' $3 $v | sort --version-sort --check &>/dev/null
   then
     printf "OK:    %-9s %-6s >= $3\n" "$1" "$v"; return 0;
   else
     printf "ERROR: %-9s is TOO OLD ($3 or later required)\n" "$1";
     return 1;
   fi
}
ver_kernel()
{
   kver=$(uname -r | grep -E -o '^[0-9\.]+')
   if printf '%s\n' $1 $kver | sort --version-sort --check &>/dev/null
   then
     printf "OK:    Linux Kernel $kver >= $1\n"; return 0;
   else
     printf "ERROR: Linux Kernel ($kver) is TOO OLD ($1 or later required)\n" "$kver";
     return 1;
   fi
}
# Coreutils first because --version-sort needs Coreutils >= 7.0
ver_check Coreutils      sort     8.1 || bail "Coreutils too old, stop"
ver_check Bash           bash     3.2
ver_check Binutils       ld       2.13.1
ver_check Bison          bison    2.7
ver_check Diffutils      diff     2.8.1
ver_check Findutils      find     4.2.31
ver_check Gawk           gawk     4.0.1
ver_check GCC            gcc      5.2
ver_check "GCC (C++)"    g++      5.2
ver_check Grep           grep     2.5.1a
ver_check Gzip           gzip     1.3.12
ver_check M4             m4       1.4.10
ver_check Make           make     4.0
ver_check Patch          patch    2.5.4
ver_check Perl           perl     5.8.8
ver_check Python         python3  3.4
ver_check Sed            sed      4.1.5
ver_check Tar            tar      1.22
ver_check Texinfo        texi2any 5.0
ver_check Xz             xz       5.0.0
ver_kernel 4.19
if mount | grep -q 'devpts on /dev/pts' && [ -e /dev/ptmx ]
then echo "OK:    Linux Kernel supports UNIX 98 PTY";
else echo "ERROR: Linux Kernel does NOT support UNIX 98 PTY"; fi
alias_check() {
   if $1 --version 2>&1 | grep -qi $2
   then printf "OK:    %-4s is $2\n" "$1";
   else printf "ERROR: %-4s is NOT $2\n" "$1"; fi
}
echo "Aliases:"
alias_check awk GNU
alias_check yacc Bison
alias_check sh Bash
echo "Compiler check:"
if printf "int main(){}" | g++ -x c++ -
then echo "OK:    g++ works";
else echo "ERROR: g++ does NOT work"; fi
rm -f a.out
if [ "$(nproc)" = "" ]; then
   echo "ERROR: nproc is not available or it produces empty output"
else
   echo "OK: nproc reports $(nproc) logical cores are available"
fi
zhihao@dust|/home/zhihao/Downloads|$ ^C
```
Run script, requirements are met.
```bash
zhihao@dust|/home/zhihao/Downloads|$ bash version-check.sh
OK:    Coreutils 9.1    >= 8.1
OK:    Bash      5.2.15 >= 3.2
OK:    Binutils  2.39.0.20220810 >= 2.13.1
OK:    Bison     3.8.2  >= 2.7
OK:    Diffutils 3.8    >= 2.8.1
OK:    Findutils 4.9.0  >= 4.2.31
OK:    Gawk      5.2.1  >= 4.0.1
OK:    GCC       13.0.1 >= 5.2
OK:    GCC (C++) 13.0.1 >= 5.2
OK:    Grep      3.8    >= 2.5.1a
OK:    Gzip      1.12   >= 1.3.12
OK:    M4        1.4.18 >= 1.4.10
OK:    Make      4.4    >= 4.0
OK:    Patch     2.7.6  >= 2.5.4
OK:    Perl      5.36.0 >= 5.8.8
OK:    Python    3.10.9 >= 3.4
OK:    Sed       4.9    >= 4.1.5
OK:    Tar       1.34   >= 1.22
OK:    Texinfo   7.0.1  >= 5.0
OK:    Xz        5.4.0  >= 5.0.0
OK:    Linux Kernel 6.2.10 >= 4.19
OK:    Linux Kernel supports UNIX 98 PTY
Aliases:
OK:    awk  is GNU
OK:    yacc is Bison
OK:    sh   is Bash
Compiler check:
OK:    g++ works
OK: nproc reports 8 logical cores are available
zhihao@dust|/home/zhihao/Downloads|$
```
### 2.4 Creating partitions

I use a 106G block device for partitions
```bash
zhihao@dust|/home/zhihao|$ lsblk /dev/sdd
NAME MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sdd    8:48   0 106.9G  0 disk
dust:/home/zhihao # parted /dev/sdd unit GiB p free
Model: ATA VBOX HARDDISK (scsi)
Disk /dev/sdd: 107GiB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags:

Number  Start    End     Size    File system  Name  Flags
        0.00GiB  107GiB  107GiB  Free Space

dust:/home/zhihao #
zhihao@dust|/home/zhihao|$
```
The root partition needs 20G size. The swap partition is 2G. (I miss to create Grub BIOS partition here, it's created at 10.4)

LFS suggests some other convenience partitions

* /boot - 200M 
* /boot/uefi - 200M
* /usr - 25G (Note: I merge /usr with / latter because it can't find /usr/sbin/init at boot time, we only need the /usr partition if we boot with initramfs, so don't create it)
* /home - 21G
* /opt - 5G
* /tmp - 3G
* /usr/src - 30G
* /root - 20G

Run partition commands:
```bash
dust:/home/zhihao # parted /dev/sdd
GNU Parted 3.5
Using /dev/sdd
Welcome to GNU Parted! Type 'help' to view a list of commands.
(parted) mklabel gpt
(parted) p
Model: ATA VBOX HARDDISK (scsi)
Disk /dev/sdd: 114820775936B
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags:

Number  Start  End  Size  File system  Name  Flags

(parted) mkpart boot 1MiB 200MiB
(parted) mkpart boot-uefi 200MiB 400MiB
(parted) mkpart usr 400MiB 26000MiB
(parted) mkpart home 26000MiB 47504MiB
(parted) mkpart opt 47504MiB 52624MiB
(parted) mkpart tmp 52624MiB 55696MiB
(parted) mkpart usr-src 55696MiB 86416MiB
(parted) mkpart root 86416MiB 100%
(parted) mkpart root 86416MiB 106896MiB
(parted) mkpart swap 106896MiB 100%
(parted) p free
Model: ATA VBOX HARDDISK (scsi)
Disk /dev/sdd: 114820775936B
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags:

Number  Start          End            Size          File system  Name       Flags
        17408B         1048575B       1031168B      Free Space
 1      1048576B       209715199B     208666624B                 boot
 2      209715200B     419430399B     209715200B                 boot-uefi
 3      419430400B     27262975999B   26843545600B               usr
 4      27262976000B   49811554303B   22548578304B               home
 5      49811554304B   55180263423B   5368709120B                opt
 6      55180263424B   58401488895B   3221225472B                tmp
 7      58401488896B   90613743615B   32212254720B               usr-src
 8      90613743616B   112088580095B  21474836480B               root
 9      112088580096B  114820120575B  2731540480B                swap
        114820120576B  114820759039B  638464B       Free Space

(parted)
```
2.4.2 Create initramfs
```bash
(lfs chroot) root:/#
cat > /usr/sbin/mkinitramfs << "EOF"
#!/bin/bash
# This file based in part on the mkinitramfs script for the LFS LiveCD
# written by Alexander E. Patrakov and Jeremy Huntwork.

copy()
{
  local file

  if [ "$2" = "lib" ]; then
    file=$(PATH=/usr/lib type -p $1)
  else
    file=$(type -p $1)
  fi

  if [ -n "$file" ] ; then
    cp $file $WDIR/usr/$2
  else
    echo "Missing required file: $1 for directory $2"
    rm -rf $WDIR
    exit 1
  fi
}

if [ -z $1 ] ; then
  INITRAMFS_FILE=initrd.img-no-kmods
else
  KERNEL_VERSION=$1
  INITRAMFS_FILE=initrd.img-$KERNEL_VERSION
fi

if [ -n "$KERNEL_VERSION" ] && [ ! -d "/usr/lib/modules/$1" ] ; then
  echo "No modules directory named $1"
  exit 1
fi

printf "Creating $INITRAMFS_FILE... "

binfiles="sh cat cp dd killall ls mkdir mknod mount "
binfiles="$binfiles umount sed sleep ln rm uname"
binfiles="$binfiles readlink basename"

# Systemd installs udevadm in /bin. Other udev implementations have it in /sbin
if [ -x /usr/bin/udevadm ] ; then binfiles="$binfiles udevadm"; fi

sbinfiles="modprobe blkid switch_root"

# Optional files and locations
for f in mdadm mdmon udevd udevadm; do
  if [ -x /usr/sbin/$f ] ; then sbinfiles="$sbinfiles $f"; fi
done

# Add lvm if present (cannot be done with the others because it
# also needs dmsetup
if [ -x /usr/sbin/lvm ] ; then sbinfiles="$sbinfiles lvm dmsetup"; fi

unsorted=$(mktemp /tmp/unsorted.XXXXXXXXXX)

DATADIR=/usr/share/mkinitramfs
INITIN=init.in

# Create a temporary working directory
WDIR=$(mktemp -d /tmp/initrd-work.XXXXXXXXXX)

# Create base directory structure
mkdir -p $WDIR/{dev,run,sys,proc,usr/{bin,lib/{firmware,modules},sbin}}
mkdir -p $WDIR/etc/{modprobe.d,udev/rules.d}
touch $WDIR/etc/modprobe.d/modprobe.conf
ln -s usr/bin  $WDIR/bin
ln -s usr/lib  $WDIR/lib
ln -s usr/sbin $WDIR/sbin
ln -s lib      $WDIR/lib64

# Create necessary device nodes
mknod -m 640 $WDIR/dev/console c 5 1
mknod -m 664 $WDIR/dev/null    c 1 3

# Install the udev configuration files
if [ -f /etc/udev/udev.conf ]; then
  cp /etc/udev/udev.conf $WDIR/etc/udev/udev.conf
fi

for file in $(find /etc/udev/rules.d/ -type f) ; do
  cp $file $WDIR/etc/udev/rules.d
done

# Install any firmware present
cp -a /usr/lib/firmware $WDIR/usr/lib

# Copy the RAID configuration file if present
if [ -f /etc/mdadm.conf ] ; then
  cp /etc/mdadm.conf $WDIR/etc
fi

# Install the init file
install -m0755 $DATADIR/$INITIN $WDIR/init

if [  -n "$KERNEL_VERSION" ] ; then
  if [ -x /usr/bin/kmod ] ; then
    binfiles="$binfiles kmod"
  else
    binfiles="$binfiles lsmod"
    sbinfiles="$sbinfiles insmod"
  fi
fi

# Install basic binaries
for f in $binfiles ; do
  ldd /usr/bin/$f | sed "s/\t//" | cut -d " " -f1 >> $unsorted
  copy /usr/bin/$f bin
done

for f in $sbinfiles ; do
  ldd /usr/sbin/$f | sed "s/\t//" | cut -d " " -f1 >> $unsorted
  copy $f sbin
done

# Add udevd libraries if not in /usr/sbin
if [ -x /usr/lib/udev/udevd ] ; then
  ldd /usr/lib/udev/udevd | sed "s/\t//" | cut -d " " -f1 >> $unsorted
elif [ -x /usr/lib/systemd/systemd-udevd ] ; then
  ldd /usr/lib/systemd/systemd-udevd | sed "s/\t//" | cut -d " " -f1 >> $unsorted
fi

# Add module symlinks if appropriate
if [ -n "$KERNEL_VERSION" ] && [ -x /usr/bin/kmod ] ; then
  ln -s kmod $WDIR/usr/bin/lsmod
  ln -s kmod $WDIR/usr/bin/insmod
fi

# Add lvm symlinks if appropriate
# Also copy the lvm.conf file
if  [ -x /usr/sbin/lvm ] ; then
  ln -s lvm $WDIR/usr/sbin/lvchange
  ln -s lvm $WDIR/usr/sbin/lvrename
  ln -s lvm $WDIR/usr/sbin/lvextend
  ln -s lvm $WDIR/usr/sbin/lvcreate
  ln -s lvm $WDIR/usr/sbin/lvdisplay
  ln -s lvm $WDIR/usr/sbin/lvscan

  ln -s lvm $WDIR/usr/sbin/pvchange
  ln -s lvm $WDIR/usr/sbin/pvck
  ln -s lvm $WDIR/usr/sbin/pvcreate
  ln -s lvm $WDIR/usr/sbin/pvdisplay
  ln -s lvm $WDIR/usr/sbin/pvscan

  ln -s lvm $WDIR/usr/sbin/vgchange
  ln -s lvm $WDIR/usr/sbin/vgcreate
  ln -s lvm $WDIR/usr/sbin/vgscan
  ln -s lvm $WDIR/usr/sbin/vgrename
  ln -s lvm $WDIR/usr/sbin/vgck
  # Conf file(s)
  cp -a /etc/lvm $WDIR/etc
fi

# Install libraries
sort $unsorted | uniq | while read library ; do
# linux-vdso and linux-gate are pseudo libraries and do not correspond to a file
# libsystemd-shared is in /lib/systemd, so it is not found by copy, and
# it is copied below anyway
  if [[ "$library" == linux-vdso.so.1 ]] ||
     [[ "$library" == linux-gate.so.1 ]] ||
     [[ "$library" == libsystemd-shared* ]]; then
    continue
  fi

  copy $library lib
done

if [ -d /usr/lib/udev ]; then
  cp -a /usr/lib/udev $WDIR/usr/lib
fi
if [ -d /usr/lib/systemd ]; then
  cp -a /usr/lib/systemd $WDIR/usr/lib
fi
if [ -d /usr/lib/elogind ]; then
  cp -a /usr/lib/elogind $WDIR/usr/lib
fi

# Install the kernel modules if requested
if [ -n "$KERNEL_VERSION" ]; then
  find \
     /usr/lib/modules/$KERNEL_VERSION/kernel/{crypto,fs,lib}                      \
     /usr/lib/modules/$KERNEL_VERSION/kernel/drivers/{block,ata,nvme,md,firewire} \
     /usr/lib/modules/$KERNEL_VERSION/kernel/drivers/{scsi,message,pcmcia,virtio} \
     /usr/lib/modules/$KERNEL_VERSION/kernel/drivers/usb/{host,storage}           \
     -type f 2> /dev/null | cpio --make-directories -p --quiet $WDIR

  cp /usr/lib/modules/$KERNEL_VERSION/modules.{builtin,order} \
            $WDIR/usr/lib/modules/$KERNEL_VERSION
  if [ -f /usr/lib/modules/$KERNEL_VERSION/modules.builtin.modinfo ]; then
    cp /usr/lib/modules/$KERNEL_VERSION/modules.builtin.modinfo \
            $WDIR/usr/lib/modules/$KERNEL_VERSION
  fi

  depmod -b $WDIR $KERNEL_VERSION
fi

( cd $WDIR ; find . | cpio -o -H newc --quiet | gzip -9 ) > $INITRAMFS_FILE

# Prepare early loading of microcode if available
if ls /usr/lib/firmware/intel-ucode/* >/dev/null 2>&1 ||
   ls /usr/lib/firmware/amd-ucode/*   >/dev/null 2>&1; then

# first empty WDIR to reuse it
  rm -r $WDIR/*

  DSTDIR=$WDIR/kernel/x86/microcode
  mkdir -p $DSTDIR

  if [ -d /usr/lib/firmware/amd-ucode ]; then
    cat /usr/lib/firmware/amd-ucode/microcode_amd*.bin > $DSTDIR/AuthenticAMD.bin
  fi

  if [ -d /usr/lib/firmware/intel-ucode ]; then
    cat /usr/lib/firmware/intel-ucode/* > $DSTDIR/GenuineIntel.bin
  fi

  ( cd $WDIR; find . | cpio -o -H newc --quiet ) > microcode.img
  cat microcode.img $INITRAMFS_FILE > tmpfile
  mv tmpfile $INITRAMFS_FILE
  rm microcode.img
fi

# Remove the temporary directories and files
rm -rf $WDIR $unsorted
printf "done.\n"

EOF
(lfs chroot) root:/#
(lfs chroot) root:/# chmod 0755 /usr/sbin/mkinitramfs
(lfs chroot) root:/#
mkdir -p /usr/share/mkinitramfs &&
cat > /usr/share/mkinitramfs/init.in << "EOF"
#!/bin/sh

PATH=/usr/bin:/usr/sbin
export PATH

problem()
{
   printf "Encountered a problem!\n\nDropping you to a shell.\n\n"
   sh
}

no_device()
{
   printf "The device %s, which is supposed to contain the\n" $1
   printf "root file system, does not exist.\n"
   printf "Please fix this problem and exit this shell.\n\n"
}

no_mount()
{
   printf "Could not mount device %s\n" $1
   printf "Sleeping forever. Please reboot and fix the kernel command line.\n\n"
   printf "Maybe the device is formatted with an unsupported file system?\n\n"
   printf "Or maybe filesystem type autodetection went wrong, in which case\n"
   printf "you should add the rootfstype=... parameter to the kernel command line.\n\n"
   printf "Available partitions:\n"
}

do_mount_root()
{
   mkdir /.root
   [ -n "$rootflags" ] && rootflags="$rootflags,"
   rootflags="$rootflags$ro"

   case "$root" in
      /dev/*    ) device=$root ;;
      UUID=*    ) eval $root; device="/dev/disk/by-uuid/$UUID" ;;
      PARTUUID=*) eval $root; device="/dev/disk/by-partuuid/$PARTUUID" ;;
      LABEL=*   ) eval $root; device="/dev/disk/by-label/$LABEL" ;;
      ""        ) echo "No root device specified." ; problem ;;
   esac

   while [ ! -b "$device" ] ; do
       no_device $device
       problem
   done

   if ! mount -n -t "$rootfstype" -o "$rootflags" "$device" /.root ; then
       no_mount $device
       cat /proc/partitions
       while true ; do sleep 10000 ; done
   else
       echo "Successfully mounted device $root"
   fi
}

do_try_resume()
{
   case "$resume" in
      UUID=* ) eval $resume; resume="/dev/disk/by-uuid/$UUID"  ;;
      LABEL=*) eval $resume; resume="/dev/disk/by-label/$LABEL" ;;
   esac

   if $noresume || ! [ -b "$resume" ]; then return; fi

   ls -lH "$resume" | ( read x x x x maj min x
       echo -n ${maj%,}:$min > /sys/power/resume )
}

init=/sbin/init
root=
rootdelay=
rootfstype=auto
ro="ro"
rootflags=
device=
resume=
noresume=false

mount -n -t devtmpfs devtmpfs /dev
mount -n -t proc     proc     /proc
mount -n -t sysfs    sysfs    /sys
mount -n -t tmpfs    tmpfs    /run

read -r cmdline < /proc/cmdline

for param in $cmdline ; do
  case $param in
    init=*      ) init=${param#init=}             ;;
    root=*      ) root=${param#root=}             ;;
    rootdelay=* ) rootdelay=${param#rootdelay=}   ;;
    rootfstype=*) rootfstype=${param#rootfstype=} ;;
    rootflags=* ) rootflags=${param#rootflags=}   ;;
    resume=*    ) resume=${param#resume=}         ;;
    noresume    ) noresume=true                   ;;
    ro          ) ro="ro"                         ;;
    rw          ) ro="rw"                         ;;
  esac
done

# udevd location depends on version
if [ -x /sbin/udevd ]; then
  UDEVD=/sbin/udevd
elif [ -x /lib/udev/udevd ]; then
  UDEVD=/lib/udev/udevd
elif [ -x /lib/systemd/systemd-udevd ]; then
  UDEVD=/lib/systemd/systemd-udevd
else
  echo "Cannot find udevd nor systemd-udevd"
  problem
fi

${UDEVD} --daemon --resolve-names=never
udevadm trigger
udevadm settle

if [ -f /etc/mdadm.conf ] ; then mdadm -As                       ; fi
if [ -x /sbin/vgchange  ] ; then /sbin/vgchange -a y > /dev/null ; fi
if [ -n "$rootdelay"    ] ; then sleep "$rootdelay"              ; fi

do_try_resume # This function will not return if resuming from disk
do_mount_root

killall -w ${UDEVD##*/}

exec switch_root /.root "$init" "$@"

EOF
(lfs chroot) root:/#
```
Install cpio
```bash
zhihao@dust|/home/zhihao|$ sudo su
bash-5.2# https://ftp.gnu.org/gnu/cpio/cpio-2.15.tar.bz2^C
bash-5.2# cd /mnt/lfs
bash-5.2# cd sources/
bash-5.2# wget "https://ftp.gnu.org/gnu/cpio/cpio-2.15.tar.bz2"
--2024-05-28 23:34:34--  https://ftp.gnu.org/gnu/cpio/cpio-2.15.tar.bz2
Resolving ftp.gnu.org (ftp.gnu.org)... 209.51.188.20, 2001:470:142:3::b
Connecting to ftp.gnu.org (ftp.gnu.org)|209.51.188.20|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1651320 (1.6M) [application/x-bzip2]
Saving to: ‘cpio-2.15.tar.bz2’

cpio-2.15.tar.bz2              100%[=================================================>]   1.57M  25.6KB/s    in 54s

2024-05-28 23:35:29 (29.9 KB/s) - ‘cpio-2.15.tar.bz2’ saved [1651320/1651320]

bash-5.2#
...
(lfs chroot) root:/sources# tar xf cpio-2.15.tar.bz2
(lfs chroot) root:/sources# cd cpio-2.15
(lfs chroot) root:/sources/cpio-2.15# ./configure --prefix=/usr \
>             --enable-mt   \
>             --with-rmt=/usr/libexec/rmt
...
(lfs chroot) root:/sources/cpio-2.15# make &&
> makeinfo --html            -o doc/html      doc/cpio.texi &&
> makeinfo --html --no-split -o doc/cpio.html doc/cpio.texi &&
> makeinfo --plaintext       -o doc/cpio.txt  doc/cpio.texi
...
(lfs chroot) root:/sources/cpio-2.15# make check
...
(lfs chroot) root:/sources/cpio-2.15# make install &&
> install -v -m755 -d /usr/share/doc/cpio-2.15/html &&
> install -v -m644    doc/html/* \
>                     /usr/share/doc/cpio-2.15/html &&
> install -v -m644    doc/cpio.{html,txt} \
>                     /usr/share/doc/cpio-2.15
...
```
Generate initramfs, but don't use it because I 
```bash
(lfs chroot) root:/tmp# mkinitramfs 6.7.4
Creating initrd.img-6.7.4... done.
(lfs chroot) root:/tmp# ls
initrd.img-6.7.4
(lfs chroot) root:/tmp# cp initrd.img-6.7.4 /boot/
(lfs chroot) root:/tmp#
```

### 2.5 Creating Filesystems

Make all patitions ext4 filesystem
```bash
dust:/home/zhihao # for i in `ls /dev/sdd[0-9]`; do mkfs -v -t ext4 $i; done
mke2fs 1.46.5 (30-Dec-2021)
fs_types for mke2fs.conf resolution: 'ext4', 'small'
Filesystem label=
OS type: Linux
Block size=1024 (log=0)
Fragment size=1024 (log=0)
Stride=0 blocks, Stripe width=0 blocks
51000 inodes, 203776 blocks
10188 blocks (5.00%) reserved for the super user
First data block=1
Maximum filesystem blocks=33816576
25 block groups
8192 blocks per group, 8192 fragments per group
2040 inodes per group
Filesystem UUID: 74b139a6-1843-4453-9245-a785d14403fa
Superblock backups stored on blocks:
        8193, 24577, 40961, 57345, 73729

Allocating group tables: done
Writing inode tables: done
Creating journal (4096 blocks): done
Writing superblocks and filesystem accounting information: done

mke2fs 1.46.5 (30-Dec-2021)
fs_types for mke2fs.conf resolution: 'ext4', 'small'
Filesystem label=
OS type: Linux
Block size=1024 (log=0)
Fragment size=1024 (log=0)
Stride=0 blocks, Stripe width=0 blocks
51200 inodes, 204800 blocks
10240 blocks (5.00%) reserved for the super user
First data block=1
Maximum filesystem blocks=33816576
25 block groups
8192 blocks per group, 8192 fragments per group
2048 inodes per group
Filesystem UUID: 0c9e71ea-32d4-4337-b3b4-2457b9d27272
Superblock backups stored on blocks:
        8193, 24577, 40961, 57345, 73729

Allocating group tables: done
Writing inode tables: done
Creating journal (4096 blocks): done
Writing superblocks and filesystem accounting information: done
...
dust:/home/zhihao # 
```
Create swap partition 
```bash
dust:/home/zhihao # mkswap /dev/sdd9
mkswap: /dev/sdd9: warning: wiping old ext4 signature.
Setting up swapspace version 1, size = 2.5 GiB (2731536384 bytes)
no label, UUID=b3e382ad-2bac-43f4-a160-37f96fe098dc
dust:/home/zhihao #
```
### 2.6 Setting $LFS Variable

Set variable
```bash
zhihao@dust|/home/zhihao|$ sudo su
[sudo] password for root:
dust:/home/zhihao #
dust:/home/zhihao # export LFS=/mnt/lfs
dust:/home/zhihao #
dust:/home/zhihao # grep LFS /home/zhihao/.bashrc /home/zhihao/.bash_profile	 /root/.bashrc /root/.bash_profile
/home/zhihao/.bashrc:export LFS=/mnt/lfs
/home/zhihao/.bash_profile:export LFS=/mnt/lfs
/root/.bashrc:export LFS=/mnt/lfs
/root/.bash_profile:export LFS=/mnt/lfs
dust:/home/zhihao #
```

### 2.7 Mounting partiions
```bash
dust:/home/zhihao # mkdir -pv $LFS
dust:/home/zhihao # lsblk -o +partlabel /dev/sdd
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS PARTLABEL
sdd      8:48   0 106.9G  0 disk
├─sdd1   8:49   0   199M  0 part             boot
├─sdd2   8:50   0   200M  0 part             boot-uefi
├─sdd3   8:51   0    25G  0 part             usr
├─sdd4   8:52   0    21G  0 part             home
├─sdd5   8:53   0     5G  0 part             opt
├─sdd6   8:54   0     3G  0 part             tmp
├─sdd7   8:55   0    30G  0 part             usr-src
├─sdd8   8:56   0    20G  0 part             root
└─sdd9   8:57   0   2.5G  0 part             swap
dust:/home/zhihao # mount -v -t ext4 /dev/sdd8 $LFS
mount: /dev/sdd8 mounted on /mnt/lfs.
dust:/home/zhihao # mkdir -v $LFS/boot; mount -v -t ext4 /dev/sdd1 $LFS/boot
mkdir: created directory '/mnt/lfs/boot'
mount: /dev/sdd1 mounted on /mnt/lfs/boot.
dust:/home/zhihao # mkdir -v $LFS/boot/efi; mount -v -t ext4 /dev/sdd2 $LFS/boot/efi
mkdir: created directory '/mnt/lfs/boot/efi'
mount: /dev/sdd2 mounted on /mnt/lfs/boot/efi.
dust:/home/zhihao # mkdir -v $LFS/usr; mount -v -t ext4 /dev/sdd3 $LFS/usr
mkdir: created directory '/mnt/lfs/usr'
mount: /dev/sdd3 mounted on /mnt/lfs/usr.
dust:/home/zhihao # mkdir -v $LFS/home; mount -v -t ext4 /dev/sdd4 $LFS/home
mkdir: created directory '/mnt/lfs/home'
mount: /dev/sdd4 mounted on /mnt/lfs/home.
dust:/home/zhihao # mkdir -v $LFS/opt; mount -v -t ext4 /dev/sdd5 $LFS/opt
mkdir: created directory '/mnt/lfs/opt'
mount: /dev/sdd5 mounted on /mnt/lfs/opt.
dust:/home/zhihao # mkdir -v $LFS/tmp; mount -v -t ext4 /dev/sdd6 $LFS/tmp
mkdir: created directory '/mnt/lfs/tmp'
mount: /dev/sdd6 mounted on /mnt/lfs/tmp.
dust:/home/zhihao # mkdir -v $LFS/usr/src; mount -v -t ext4 /dev/sdd7 $LFS/usr/src
mkdir: created directory '/mnt/lfs/usr/src'
mount: /dev/sdd7 mounted on /mnt/lfs/usr/src.
dust:/home/zhihao #
```
Add to fstab 
```bash
dust:/home/zhihao # tail -n9 /etc/fstab
/dev/disk/by-partlabel/root /mnt/lfs/root ext4   defaults      1     1
/dev/disk/by-partlabel/boot /mnt/lfs/boot ext4   defaults      1     1
/dev/disk/by-partlabel/boot-uefi /mnt/lfs/boot/efi ext4   defaults      1     1
/dev/disk/by-partlabel/usr /mnt/lfs/usr ext4   defaults      1     1
/dev/disk/by-partlabel/home /mnt/lfs/home ext4   defaults      1     1
/dev/disk/by-partlabel/opt /mnt/lfs/opt ext4   defaults      1     1
/dev/disk/by-partlabel/tmp /mnt/lfs/tmp ext4   defaults      1     1
/dev/disk/by-partlabel/usr-src /mnt/lfs/usr/src ext4   defaults      1     1
/dev/disk/by-partlabel/swap  swap                    swap   defaults                      0  0
dust:/home/zhihao # 
```
Test if fstab works 
```bash
dust:/home/zhihao # findmnt $LFS/home
TARGET        SOURCE    FSTYPE OPTIONS
/mnt/lfs/home /dev/sdd4 ext4   rw,relatime
dust:/home/zhihao # umount $LFS/home
dust:/home/zhihao # findmnt $LFS/home
dust:/home/zhihao # mount $LFS/home
dust:/home/zhihao # findmnt $LFS/home
TARGET        SOURCE    FSTYPE OPTIONS
/mnt/lfs/home /dev/sdd4 ext4   rw,relatime
dust:/home/zhihao #
```
Turn on swap
```bash
dust:/home/zhihao # swapon -a
dust:/home/zhihao # swapon -s
Filename                                Type            Size            Used            Priority
/dev/sda3                               partition       1561896         0               -2
/dev/sdd9                               partition       2667516         0               -3
dust:/home/zhihao #
```
## 3. Packages and Patches

### 3.1 Introduction

Create sources directory
```bash
dust:/home/zhihao # echo $LFS
/mnt/lfs
dust:/home/zhihao # mkdir $LFS/sources
dust:/home/zhihao # chmod -v a+wt $LFS/sources
mode of '/mnt/lfs/sources' changed from 0755 (rwxr-xr-x) to 1777 (rwxrwxrwt)
```
Create wget-list-sysv
```bash
dust:/home/zhihao/Downloads # cat wget-list-sysv
https://download.savannah.gnu.org/releases/acl/acl-2.3.2.tar.xz
https://download.savannah.gnu.org/releases/attr/attr-2.5.2.tar.gz
https://ftp.gnu.org/gnu/autoconf/autoconf-2.72.tar.xz
https://ftp.gnu.org/gnu/automake/automake-1.16.5.tar.xz
https://ftp.gnu.org/gnu/bash/bash-5.2.21.tar.gz
https://github.com/gavinhoward/bc/releases/download/6.7.5/bc-6.7.5.tar.xz
https://sourceware.org/pub/binutils/releases/binutils-2.42.tar.xz
https://ftp.gnu.org/gnu/bison/bison-3.8.2.tar.xz
https://www.sourceware.org/pub/bzip2/bzip2-1.0.8.tar.gz
https://github.com/libcheck/check/releases/download/0.15.2/check-0.15.2.tar.gz
https://ftp.gnu.org/gnu/coreutils/coreutils-9.4.tar.xz
https://ftp.gnu.org/gnu/dejagnu/dejagnu-1.6.3.tar.gz
https://ftp.gnu.org/gnu/diffutils/diffutils-3.10.tar.xz
https://downloads.sourceforge.net/project/e2fsprogs/e2fsprogs/v1.47.0/e2fsprogs-1.47.0.tar.gz
https://sourceware.org/ftp/elfutils/0.190/elfutils-0.190.tar.bz2
https://prdownloads.sourceforge.net/expat/expat-2.6.0.tar.xz
https://prdownloads.sourceforge.net/expect/expect5.45.4.tar.gz
https://astron.com/pub/file/file-5.45.tar.gz
https://ftp.gnu.org/gnu/findutils/findutils-4.9.0.tar.xz
https://github.com/westes/flex/releases/download/v2.6.4/flex-2.6.4.tar.gz
https://pypi.org/packages/source/f/flit-core/flit_core-3.9.0.tar.gz
https://ftp.gnu.org/gnu/gawk/gawk-5.3.0.tar.xz
https://ftp.gnu.org/gnu/gcc/gcc-13.2.0/gcc-13.2.0.tar.xz
https://ftp.gnu.org/gnu/gdbm/gdbm-1.23.tar.gz
https://ftp.gnu.org/gnu/gettext/gettext-0.22.4.tar.xz
https://ftp.gnu.org/gnu/glibc/glibc-2.39.tar.xz
https://ftp.gnu.org/gnu/gmp/gmp-6.3.0.tar.xz
https://ftp.gnu.org/gnu/gperf/gperf-3.1.tar.gz
https://ftp.gnu.org/gnu/grep/grep-3.11.tar.xz
https://ftp.gnu.org/gnu/groff/groff-1.23.0.tar.gz
https://ftp.gnu.org/gnu/grub/grub-2.12.tar.xz
https://ftp.gnu.org/gnu/gzip/gzip-1.13.tar.xz
https://github.com/Mic92/iana-etc/releases/download/20240125/iana-etc-20240125.tar.gz
https://ftp.gnu.org/gnu/inetutils/inetutils-2.5.tar.xz
https://launchpad.net/intltool/trunk/0.51.0/+download/intltool-0.51.0.tar.gz
https://www.kernel.org/pub/linux/utils/net/iproute2/iproute2-6.7.0.tar.xz
https://pypi.org/packages/source/J/Jinja2/Jinja2-3.1.3.tar.gz
https://www.kernel.org/pub/linux/utils/kbd/kbd-2.6.4.tar.xz
https://www.kernel.org/pub/linux/utils/kernel/kmod/kmod-31.tar.xz
https://www.greenwoodsoftware.com/less/less-643.tar.gz
https://www.linuxfromscratch.org/lfs/downloads/12.1/lfs-bootscripts-20230728.tar.xz
https://www.kernel.org/pub/linux/libs/security/linux-privs/libcap2/libcap-2.69.tar.xz
https://github.com/libffi/libffi/releases/download/v3.4.4/libffi-3.4.4.tar.gz
https://download.savannah.gnu.org/releases/libpipeline/libpipeline-1.5.7.tar.gz
https://ftp.gnu.org/gnu/libtool/libtool-2.4.7.tar.xz
https://github.com/besser82/libxcrypt/releases/download/v4.4.36/libxcrypt-4.4.36.tar.xz
https://www.kernel.org/pub/linux/kernel/v6.x/linux-6.7.4.tar.xz
https://ftp.gnu.org/gnu/m4/m4-1.4.19.tar.xz
https://ftp.gnu.org/gnu/make/make-4.4.1.tar.gz
https://download.savannah.gnu.org/releases/man-db/man-db-2.12.0.tar.xz
https://www.kernel.org/pub/linux/docs/man-pages/man-pages-6.06.tar.xz
https://pypi.org/packages/source/M/MarkupSafe/MarkupSafe-2.1.5.tar.gz
https://github.com/mesonbuild/meson/releases/download/1.3.2/meson-1.3.2.tar.gz
https://ftp.gnu.org/gnu/mpc/mpc-1.3.1.tar.gz
https://ftp.gnu.org/gnu/mpfr/mpfr-4.2.1.tar.xz
https://anduin.linuxfromscratch.org/LFS/ncurses-6.4-20230520.tar.xz
https://github.com/ninja-build/ninja/archive/v1.11.1/ninja-1.11.1.tar.gz
https://www.openssl.org/source/openssl-3.2.1.tar.gz
https://ftp.gnu.org/gnu/patch/patch-2.7.6.tar.xz
https://www.cpan.org/src/5.0/perl-5.38.2.tar.xz
https://distfiles.ariadne.space/pkgconf/pkgconf-2.1.1.tar.xz
https://sourceforge.net/projects/procps-ng/files/Production/procps-ng-4.0.4.tar.xz
https://sourceforge.net/projects/psmisc/files/psmisc/psmisc-23.6.tar.xz
https://www.python.org/ftp/python/3.12.2/Python-3.12.2.tar.xz
https://www.python.org/ftp/python/doc/3.12.2/python-3.12.2-docs-html.tar.bz2
https://ftp.gnu.org/gnu/readline/readline-8.2.tar.gz
https://ftp.gnu.org/gnu/sed/sed-4.9.tar.xz
https://pypi.org/packages/source/s/setuptools/setuptools-69.1.0.tar.gz
https://github.com/shadow-maint/shadow/releases/download/4.14.5/shadow-4.14.5.tar.xz
https://www.infodrom.org/projects/sysklogd/download/sysklogd-1.5.1.tar.gz
https://github.com/systemd/systemd/archive/v255/systemd-255.tar.gz
https://anduin.linuxfromscratch.org/LFS/systemd-man-pages-255.tar.xz
https://github.com/slicer69/sysvinit/releases/download/3.08/sysvinit-3.08.tar.xz
https://ftp.gnu.org/gnu/tar/tar-1.35.tar.xz
https://downloads.sourceforge.net/tcl/tcl8.6.13-src.tar.gz
https://downloads.sourceforge.net/tcl/tcl8.6.13-html.tar.gz
https://ftp.gnu.org/gnu/texinfo/texinfo-7.1.tar.xz
https://www.iana.org/time-zones/repository/releases/tzdata2024a.tar.gz
https://anduin.linuxfromscratch.org/LFS/udev-lfs-20230818.tar.xz
https://www.kernel.org/pub/linux/utils/util-linux/v2.39/util-linux-2.39.3.tar.xz
https://github.com/vim/vim/archive/v9.1.0041/vim-9.1.0041.tar.gz
https://pypi.org/packages/source/w/wheel/wheel-0.42.0.tar.gz
https://cpan.metacpan.org/authors/id/T/TO/TODDR/XML-Parser-2.47.tar.gz
https://github.com/tukaani-project/xz/releases/download/v5.4.6/xz-5.4.6.tar.xz
https://zlib.net/fossils/zlib-1.3.1.tar.gz
https://github.com/facebook/zstd/releases/download/v1.5.5/zstd-1.5.5.tar.gz
dust:/home/zhihao/Downloads #
```
Download packages
```bash
dust:/home/zhihao/Downloads # proxychains4 wget --input-file=wget-list-sysv --continue --directory-prefix=$LFS/sources
```
Some packages are not found
```bash
zhihao@dust|/home/zhihao/Downloads|$ wget --continue --directory-prefix=$LFS/sources https://prdownloads.sourceforge.net/expat/expat-2.6.0.tar.xz
--2024-05-22 11:03:39--  https://prdownloads.sourceforge.net/expat/expat-2.6.0.tar.xz
Connecting to 10.0.2.2:7890... connected.
Proxy request sent, awaiting response... 404 Not Found
2024-05-22 11:03:40 ERROR 404: Not Found.
```
The reason is the expat file has been renamed as VULNERABLE https://sourceforge.net/projects/expat/files/expat/2.6.0/expat-2.6.0-RENAMED-VULNERABLE-PLEASE-USE-2.6.2-INSTEAD.tar.xz/download

I download 2.6.2 instead https://sourceforge.net/projects/expat/files/expat/2.6.2/expat-2.6.2.tar.xz/download 
```bash
zhihao@dust|/home/zhihao/Downloads|$ wget --continue --directory-prefix=$LFS/sources https://prdownloads.sourceforge.net/expat/expat-2.6.2.tar.xz
--2024-05-22 11:07:17--  https://prdownloads.sourceforge.net/expat/expat-2.6.2.tar.xz
Connecting to 10.0.2.2:7890... connected.
Proxy request sent, awaiting response... 301 Moved Permanently
Location: https://downloads.sourceforge.net/project/expat/expat/2.6.2/expat-2.6.2.tar.xz [following]
--2024-05-22 11:07:20--  https://downloads.sourceforge.net/project/expat/expat/2.6.2/expat-2.6.2.tar.xz
Connecting to 10.0.2.2:7890... connected.
Proxy request sent, awaiting response... 302 Found
Location: https://netactuate.dl.sourceforge.net/project/expat/expat/2.6.2/expat-2.6.2.tar.xz?viasf=1 [following]
--2024-05-22 11:07:22--  https://netactuate.dl.sourceforge.net/project/expat/expat/2.6.2/expat-2.6.2.tar.xz?viasf=1
Connecting to 10.0.2.2:7890... connected.
Proxy request sent, awaiting response... 200 OK
Length: 485236 (474K) [application/octet-stream]
Saving to: ‘/mnt/lfs/sources/expat-2.6.2.tar.xz’

expat-2.6.2.tar.xz             100%[=================================================>] 473.86K   671KB/s    in 0.7s

2024-05-22 11:07:24 (671 KB/s) - ‘/mnt/lfs/sources/expat-2.6.2.tar.xz’ saved [485236/485236]

zhihao@dust|/home/zhihao/Downloads|$
```

Download patches
```bash
dust:/home/zhihao/Downloads # cat wget-list-patches
https://www.linuxfromscratch.org/patches/lfs/12.1/bash-5.2.21-upstream_fixes-1.patch
https://www.linuxfromscratch.org/patches/lfs/12.1/bzip2-1.0.8-install_docs-1.patch
https://www.linuxfromscratch.org/patches/lfs/12.1/coreutils-9.4-i18n-1.patch
https://www.linuxfromscratch.org/patches/lfs/12.1/glibc-2.39-fhs-1.patch
https://www.linuxfromscratch.org/patches/lfs/12.1/kbd-2.6.4-backspace-1.patch
https://www.linuxfromscratch.org/patches/lfs/12.1/readline-8.2-upstream_fixes-3.patch
https://www.linuxfromscratch.org/patches/lfs/12.1/sysvinit-3.08-consolidated-1.patch
dust:/home/zhihao/Downloads #
dust:/home/zhihao/Downloads # proxychains4 wget --input-file=wget-list-patches --continue --directory-prefix=$LFS/sources
```
Update owner
```bash
    dust:/home/zhihao # chown root:root $LFS/sources/*
    dust:/home/zhihao #
```

## 4. Final Preparations

### 4.2 Create Limited Directory Layout
```bash
dust:/home/zhihao/Downloads # mkdir -pv $LFS/{etc,var} $LFS/usr/{bin,lib,sbin}
mkdir: created directory '/mnt/lfs/etc'
mkdir: created directory '/mnt/lfs/var'
mkdir: created directory '/mnt/lfs/usr/bin'
mkdir: created directory '/mnt/lfs/usr/lib'
mkdir: created directory '/mnt/lfs/usr/sbin'
dust:/home/zhihao/Downloads # cd $LFS
dust:/mnt/lfs # for i in bin lib sbin; do
>   ln -sv usr/$i $LFS/$i
> done
'/mnt/lfs/bin' -> 'usr/bin'
'/mnt/lfs/lib' -> 'usr/lib'
'/mnt/lfs/sbin' -> 'usr/sbin'
dust:/mnt/lfs # ll
total 38
lrwxrwxrwx 1 root root    7 May 18 21:53 bin -> usr/bin
drwxr-xr-x 4 root root 1024 Apr 24 11:15 boot
drwxr-xr-x 3 root root 1024 Apr 24 09:39 boot-uefi
drwxr-xr-x 1 root root    0 May 18 21:50 etc
drwxr-xr-x 3 root root 4096 Apr 24 09:39 home
lrwxrwxrwx 1 root root    7 May 18 21:53 lib -> usr/lib
drwxr-xr-x 3 root root 4096 Apr 24 09:39 opt
drwxr-xr-x 8 root root 4096 Apr 24 11:16 root
lrwxrwxrwx 1 root root    8 May 18 21:53 sbin -> usr/sbin
drwxrwxrwt 1 root root 3720 May 18 21:44 sources
drwxr-xr-x 3 root root 4096 Apr 24 09:39 tmp
drwxr-xr-x 7 root root 4096 May 18 21:50 usr
drwxr-xr-x 3 root root 4096 Apr 24 09:39 usr-src
drwxr-xr-x 1 root root    0 May 18 21:50 var
dust:/mnt/lfs # case $(uname -m) in
>   x86_64) mkdir -pv $LFS/lib64 ;;
> esac
mkdir: created directory '/mnt/lfs/lib64'
dust:/mnt/lfs #
dust:/mnt/lfs # mkdir -pv $LFS/tools
mkdir: created directory '/mnt/lfs/tools'
dust:/mnt/lfs #
```
### 4.3 Add lfs User
```bash
dust:/mnt/lfs # groupadd lfs
dust:/mnt/lfs # useradd -s /bin/bash -g lfs -m -k /dev/null lfs
dust:/mnt/lfs # passwd lfs
dust:/mnt/lfs # chown -v lfs $LFS/{usr{,/*},lib,var,etc,bin,sbin,tools}
changed ownership of '/mnt/lfs/usr' from root to lfs
changed ownership of '/mnt/lfs/usr/bin' from root to lfs
changed ownership of '/mnt/lfs/usr/lib' from root to lfs
changed ownership of '/mnt/lfs/usr/lost+found' from root to lfs
changed ownership of '/mnt/lfs/usr/sbin' from root to lfs
changed ownership of '/mnt/lfs/usr/src' from root to lfs
ownership of '/mnt/lfs/lib' retained as lfs
changed ownership of '/mnt/lfs/var' from root to lfs
changed ownership of '/mnt/lfs/etc' from root to lfs
ownership of '/mnt/lfs/bin' retained as lfs
ownership of '/mnt/lfs/sbin' retained as lfs
changed ownership of '/mnt/lfs/tools' from root to lfs
dust:/mnt/lfs # echo $?
0
dust:/mnt/lfs # case $(uname -m) in
>   x86_64) chown -v lfs $LFS/lib64 ;;
> esac
changed ownership of '/mnt/lfs/lib64' from root to lfs
dust:/mnt/lfs #
dust:/mnt/lfs # su - lfs
lfs@dust:~>
```
### 4.4 Setting Up Environment
```bash
lfs@dust:~> cat > ~/.bash_profile << "EOF"
> exec env -i HOME=$HOME TERM=$TERM PS1='\u:\w\$ ' /bin/bash
> EOF
lfs@dust:~> cat > ~/.bashrc << "EOF"
> set +h
> umask 022
> LFS=/mnt/lfs
> LC_ALL=POSIX
> LFS_TGT=$(uname -m)-lfs-linux-gnu
> PATH=/usr/bin
> if [ ! -L /bin ]; then PATH=/bin:$PATH; fi
> PATH=$LFS/tools/bin:$PATH
> CONFIG_SITE=$LFS/usr/share/config.site
> export LFS LC_ALL LFS_TGT PATH CONFIG_SITE
> EOF
lfs@dust:~>
```
Rename bash.bashrc
```bash
dust:/home/zhihao # [ ! -e /etc/bash.bashrc ] || mv -v /etc/bash.bashrc /etc/bash.bashrc.NOUSE
renamed '/etc/bash.bashrc' -> '/etc/bash.bashrc.NOUSE'
dust:/home/zhihao #
```
Set option and relogin to make it work
```bash
lfs@dust:~> cat >> ~/.bashrc << "EOF"
> export MAKEFLAGS=-j$(nproc)
> EOF
lfs@dust:~>
lfs@dust:~> echo $LFS

lfs@dust:~> logout
dust:/mnt/lfs # su - lfs
lfs:~$ echo $LFS
/mnt/lfs
```

## 5. Compiling a Cross-Toolchain

### 5.2 Compile Binutils

Decompress binutils shows file group error, but file is extracted successfully
```bash
lfs:/mnt/lfs/sources$ xz -dk binutils-2.42.tar.xz
xz: binutils-2.42.tar: Cannot set the file group: Operation not permitted
lfs:/mnt/lfs/sources$
lfs:/mnt/lfs/sources$ ls -al binutils-2.42.tar*
-rw-r--r-- 1 lfs  lfs  319897600 Jan 29 23:25 binutils-2.42.tar
-rw-r--r-- 1 root root  27567160 Jan 29 23:25 binutils-2.42.tar.xz
lfs:/mnt/lfs/sources$
```
Decompress tar file
```bash
lfs:/mnt/lfs/sources$ tar -xvf binutils-2.42.tar
lfs:/mnt/lfs/sources/binutils-2.42$ ls
COPYING                 SECURITY.txt  cpu         libiberty       mkinstalldirs
COPYING.LIB             ar-lib        depcomp     libsframe       move-if-change
COPYING3                bfd           elfcpp      libtool.m4      multilib.am
COPYING3.LIB            binutils      etc         ltgcc.m4        opcodes
ChangeLog               compile       gas         ltmain.sh       setup.com
ChangeLog.git           config        gold        ltoptions.m4    sha256.sum
MAINTAINERS             config-ml.in  gprof       ltsugar.m4      src-release.sh
Makefile.def            config.guess  gprofng     ltversion.m4    symlink-tree
Makefile.in             config.rpath  include     lt~obsolete.m4  test-driver
Makefile.tpl            config.sub    install-sh  makefile.vms    texinfo
README                  configure     ld          missing         ylwrap
README-maintainer-mode  configure.ac  libctf      mkdep           zlib
lfs:/mnt/lfs/sources/binutils-2.42$
```
Configure binutils
```bash
lfs:/mnt/lfs/sources/binutils-2.42$ mkdir -v build
mkdir: created directory 'build'
lfs:/mnt/lfs/sources/binutils-2.42$ cd build/
lfs:/mnt/lfs/sources/binutils-2.42/build$ echo $LFS
/mnt/lfs
lfs:/mnt/lfs/sources/binutils-2.42/build$
lfs:/mnt/lfs/sources/binutils-2.42/build$ ../configure --prefix=$LFS/tools \
>              --with-sysroot=$LFS \
>              --target=$LFS_TGT   \
>              --disable-nls       \
>              --enable-gprofng=no \
>              --disable-werror    \
>              --enable-default-hash-style=gnu
checking build system type... x86_64-pc-linux-gnu
checking host system type... x86_64-pc-linux-gnu
checking target system type... x86_64-lfs-linux-gnu
checking for a BSD-compatible install... /usr/bin/install -c
...
lfs:/mnt/lfs/sources/binutils-2.42/build$ make
lfs:/mnt/lfs/sources/binutils-2.42/build$ make install
```
### 5.3 Install GCC
```bash
lfs:/mnt/lfs/sources$ xz -dk gcc-13.2.0.tar.xz
xz: gcc-13.2.0.tar: Cannot set the file group: Operation not permitted
lfs:/mnt/lfs/sources$ ls -al gcc-13.2.0.tar
-rw-r--r-- 1 lfs lfs 793477120 Jul 27  2023 gcc-13.2.0.tar
lfs:/mnt/lfs/sources$ tar -xvf gcc-13.2.0.tar
...
lfs:/mnt/lfs/sources$ cd gcc-13.2.0
lfs:/mnt/lfs/sources/gcc-13.2.0$
```
Handle requirements
```bash
lfs:/mnt/lfs/sources/gcc-13.2.0$ tar -xf ../mpfr-4.2.1.tar.xz
lfs:/mnt/lfs/sources/gcc-13.2.0$ mv -v mpfr-4.2.1 mpfr
renamed 'mpfr-4.2.1' -> 'mpfr'
lfs:/mnt/lfs/sources/gcc-13.2.0$ tar -xf ../gmp-6.3.0.tar.xz
lfs:/mnt/lfs/sources/gcc-13.2.0$ echo $?
0
lfs:/mnt/lfs/sources/gcc-13.2.0$ mv -v gmp-6.3.0 gmp
renamed 'gmp-6.3.0' -> 'gmp'

lfs:/mnt/lfs/sources/gcc-13.2.0$ tar -xf ../mpc-1.3.1.tar.gz
lfs:/mnt/lfs/sources/gcc-13.2.0$ mv -v mpc-1.3.1 mpc
renamed 'mpc-1.3.1' -> 'mpc'
lfs:/mnt/lfs/sources/gcc-13.2.0$
lfs:/mnt/lfs/sources/gcc-13.2.0$ case $(uname -m) in
>   x86_64)
>     sed -e '/m64=/s/lib64/lib/' \
>         -i.orig gcc/config/i386/t-linux64
>  ;;
> esac
lfs:/mnt/lfs/sources/gcc-13.2.0$
```
Create build dir
```bash
lfs:/mnt/lfs/sources/gcc-13.2.0$ mkdir -v build; cd build
mkdir: created directory 'build'
lfs:/mnt/lfs/sources/gcc-13.2.0/build$
```
Configure
```bash
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ ../configure                  \
>     --target=$LFS_TGT         \
>     --prefix=$LFS/tools       \
>     --with-glibc-version=2.39 \
>     --with-sysroot=$LFS       \
>     --with-newlib             \
>     --without-headers         \
>     --enable-default-pie      \
>     --enable-default-ssp      \
>     --disable-nls             \
>     --disable-shared          \
>     --disable-multilib        \
>     --disable-threads         \
>     --disable-libatomic       \
>     --disable-libgomp         \
>     --disable-libquadmath     \
>     --disable-libssp          \
>     --disable-libvtv          \
>     --disable-libstdcxx       \
>     --enable-languages=c,c++
```
Start install
```bash
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ make
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ make install
```
Update limits.h
```bash
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ cd ..
lfs:/mnt/lfs/sources/gcc-13.2.0$ cat gcc/limitx.h gcc/glimits.h gcc/limity.h > \
>   `dirname $($LFS_TGT-gcc -print-libgcc-file-name)`/include/limits.h
lfs:/mnt/lfs/sources/gcc-13.2.0$
```
### 5.4 install linux-6.7.4
```bash
lfs:/mnt/lfs/sources$ tar xf linux-6.7.4.tar.xz
lfs:/mnt/lfs/sources$ cd linux-6.7.4
lfs:/mnt/lfs/sources/linux-6.7.4$ ls
COPYING        Kbuild    MAINTAINERS  arch   crypto   include   ipc     mm    samples   sound  virt
CREDITS        Kconfig   Makefile     block  drivers  init      kernel  net   scripts   tools
Documentation  LICENSES  README       certs  fs       io_uring  lib     rust  security  usr
lfs:/mnt/lfs/sources/linux-6.7.4$ make mrproper
lfs:/mnt/lfs/sources/linux-6.7.4$ echo $?
0
lfs:/mnt/lfs/sources/linux-6.7.4$
lfs:/mnt/lfs/sources/linux-6.7.4$ make headers
  WRAP    arch/x86/include/generated/uapi/asm/errno.h
  WRAP    arch/x86/include/generated/uapi/asm/bpf_perf_event.h
  HOSTCC  scripts/basic/fixdep
  WRAP    arch/x86/include/generated/uapi/asm/fcntl.h
  SYSHDR  arch/x86/include/generated/uapi/asm/unistd_32.h
  UPD     include/generated/uapi/linux/version.h
  SYSHDR  arch/x86/include/generated/uapi/asm/unistd_64.h
  WRAP    arch/x86/include/generated/uapi/asm/ioctl.h
  WRAP    arch/x86/include/generated/uapi/asm/ioctls.h
  WRAP    arch/x86/include/generated/uapi/asm/ipcbuf.h
  SYSHDR  arch/x86/include/generated/uapi/asm/unistd_x32.h
  WRAP    arch/x86/include/generated/uapi/asm/param.h
  WRAP    arch/x86/include/generated/uapi/asm/poll.h
  WRAP    arch/x86/include/generated/uapi/asm/resource.h
  SYSTBL  arch/x86/include/generated/asm/syscalls_32.h
  WRAP    arch/x86/include/generated/uapi/asm/socket.h
  WRAP    arch/x86/include/generated/uapi/asm/sockios.h
  WRAP    arch/x86/include/generated/uapi/asm/termbits.h
  WRAP    arch/x86/include/generated/uapi/asm/termios.h
  WRAP    arch/x86/include/generated/uapi/asm/types.h
  HOSTCC  scripts/unifdef
  HOSTCC  arch/x86/tools/relocs_32.o
  ...
lfs:/mnt/lfs/sources/linux-6.7.4$ find usr/include/ -type f !  -name '*.h' -delete
lfs:/mnt/lfs/sources/linux-6.7.4$ cp -rv usr/include $LFS/usr
'usr/include' -> '/mnt/lfs/usr/include'
'usr/include/asm-generic' -> '/mnt/lfs/usr/include/asm-generic'
'usr/include/asm-generic/kvm_para.h' -> '/mnt/lfs/usr/include/asm-generic/kvm_para.h'
'usr/include/asm-generic/signal.h' -> '/mnt/lfs/usr/include/asm-generic/signal.h'
```
### 5.5 Glibc

Install
```bash
lfs:/mnt/lfs/sources$ tar xf glibc-2.39.tar.xz
lfs:/mnt/lfs/sources/glibc-2.39$ case $(uname -m) in
>     i?86)   ln -sfv ld-linux.so.2 $LFS/lib/ld-lsb.so.3
>     ;;
>     x86_64) ln -sfv ../lib/ld-linux-x86-64.so.2 $LFS/lib64
>             ln -sfv ../lib/ld-linux-x86-64.so.2 $LFS/lib64/ld-lsb-x86-64.so.3
>     ;;
> esac
'/mnt/lfs/lib64/ld-linux-x86-64.so.2' -> '../lib/ld-linux-x86-64.so.2'
'/mnt/lfs/lib64/ld-lsb-x86-64.so.3' -> '../lib/ld-linux-x86-64.so.2'
lfs:/mnt/lfs/sources/glibc-2.39$
lfs:/mnt/lfs/sources/glibc-2.39$ patch -Np1 -i ../glibc-2.39-fhs-1.patch
patching file Makeconfig
Hunk #1 succeeded at 262 (offset 12 lines).
patching file nscd/nscd.h
Hunk #1 succeeded at 160 (offset 48 lines).
patching file nss/db-Makefile
Hunk #1 succeeded at 21 (offset -1 lines).
patching file sysdeps/generic/paths.h
patching file sysdeps/unix/sysv/linux/paths.h
lfs:/mnt/lfs/sources/glibc-2.39$
lfs:/mnt/lfs/sources/glibc-2.39$ mkdir -v build
mkdir: created directory 'build'
lfs:/mnt/lfs/sources/glibc-2.39$ cd build
lfs:/mnt/lfs/sources/glibc-2.39/build$
lfs:/mnt/lfs/sources/glibc-2.39/build$ echo "rootsbindir=/usr/sbin" > configparms
lfs:/mnt/lfs/sources/glibc-2.39/build$
lfs:/mnt/lfs/sources/glibc-2.39/build$ ../configure                             \
>       --prefix=/usr                      \
>       --host=$LFS_TGT                    \
>       --build=$(../scripts/config.guess) \
>       --enable-kernel=4.19               \
>       --with-headers=$LFS/usr/include    \
>       --disable-nscd                     \
>       libc_cv_slibdir=/usr/lib
checking build system type... x86_64-pc-linux-gnu
checking host system type... x86_64-lfs-linux-gnu
checking for x86_64-lfs-linux-gnu-gcc... x86_64-lfs-linux-gnu-gcc
checking for suffix of object files... o
checking whether the compiler supports GNU C... yes
checking whether x86_64-lfs-linux-gnu-gcc accepts -g... yes
checking for x86_64-lfs-linux-gnu-gcc option to enable C11 features... none needed
...
lfs:/mnt/lfs/sources/glibc-2.39/build$ make
...
lfs:/mnt/lfs/sources/glibc-2.39/build$ make DESTDIR=$LFS install
...
lfs:/mnt/lfs$ du -h -d1 /mnt/lfs/
du: cannot read directory '/mnt/lfs/tmp/lost+found': Permission denied
20K     /mnt/lfs/tmp
4.0K    /mnt/lfs/lib64
du: cannot read directory '/mnt/lfs/usr/src/lost+found': Permission denied
118M    /mnt/lfs/usr
7.3G    /mnt/lfs/sources
du: cannot read directory '/mnt/lfs/boot/efi/lost+found': Permission denied
du: cannot read directory '/mnt/lfs/boot/lost+found': Permission denied
26K     /mnt/lfs/boot
8.0K    /mnt/lfs/etc
du: cannot read directory '/mnt/lfs/lost+found': Permission denied
16K     /mnt/lfs/lost+found
du: cannot read directory '/mnt/lfs/home/lost+found': Permission denied
20K     /mnt/lfs/home
1.3G    /mnt/lfs/tools
20K     /mnt/lfs/var
du: cannot read directory '/mnt/lfs/opt/lost+found': Permission denied
20K     /mnt/lfs/opt
8.6G    /mnt/lfs/
lfs:/mnt/lfs$
sed '/RTLDLIST=/s@/usr@@g' -i $LFS/usr/bin/ldd
```
Test if installed successfully
```bash
lfs:/mnt/lfs/sources/glibc-2.39/build$ echo 'int main(){}' | $LFS_TGT-gcc -xc -
lfs:/mnt/lfs/sources/glibc-2.39/build$ readelf -l a.out | grep ld-linux
      [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]
lfs:/mnt/lfs/sources/glibc-2.39/build$ echo $LFS_TGT
x86_64-lfs-linux-gnu
lfs:/mnt/lfs/sources/glibc-2.39/build$ which $LFS_TGT-gcc
/mnt/lfs/tools/bin/x86_64-lfs-linux-gnu-gcc
lfs:/mnt/lfs/sources/glibc-2.39/build$
lfs:/mnt/lfs/sources/glibc-2.39/build$ rm -v a.out
removed 'a.out'
lfs:/mnt/lfs/sources/glibc-2.39/build$
```
### 5.6 Libstdc++ from GCC-13.2.0
```bash
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ ls
Makefile                   gcc           libcpp        serdep.tmp
build-x86_64-pc-linux-gnu  gmp           libdecnumber  x86_64-lfs-linux-gnu
c++tools                   intl          libiberty     zlib
config.log                 libbacktrace  lto-plugin
config.status              libcc1        mpc
fixincludes                libcody       mpfr
lfs:/mnt/lfs/sources/gcc-13.2.0/build$
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ ../libstdc++-v3/configure           \>     --host=$LFS_TGT                 \
>     --build=$(../config.guess)      \
>     --prefix=/usr                   \
>     --disable-multilib              \
>     --disable-nls                   \
>     --disable-libstdcxx-pch         \
>     --with-gxx-include-dir=/tools/$LFS_TGT/include/c++/13.2.0
checking build system type... x86_64-pc-linux-gnu
checking host system type... x86_64-lfs-linux-gnu
checking target system type... x86_64-lfs-linux-gnu
checking for a BSD-compatible install... /usr/bin/install -c
...
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ make
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ make DESTDIR=$LFS install
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ rm -v $LFS/usr/lib/lib{stdc++{,exp,fs},supc++}.la
removed '/mnt/lfs/usr/lib/libstdc++.la'
removed '/mnt/lfs/usr/lib/libstdc++exp.la'
removed '/mnt/lfs/usr/lib/libstdc++fs.la'
removed '/mnt/lfs/usr/lib/libsupc++.la'
lfs:/mnt/lfs/sources/gcc-13.2.0/build$
```
## 6. Cross Compiling Temporary Tools

### 6.2 M4-1.4.19
```bash
lfs:/mnt/lfs/sources$ tar xf m4-1.4.19.tar.xz
lfs:/mnt/lfs/sources$ cd m4-1.4.19
lfs:/mnt/lfs/sources/m4-1.4.19$
lfs:/mnt/lfs/sources/m4-1.4.19$ ./configure --prefix=/usr   \
>             --host=$LFS_TGT \
>             --build=$(build-aux/config.guess)
checking for a BSD-compatible install... /usr/bin/install -c
checking whether build environment is sane... yes
checking for x86_64-lfs-linux-gnu-strip... x86_64-lfs-linux-gnu-strip
...
```
Make fails at MB_LEN_MAX error
```bash
lfs:/mnt/lfs/sources/m4-1.4.19$ make
...
/mnt/lfs/usr/include/bits/stdlib.h: In function 'wctomb':
/mnt/lfs/usr/include/bits/stdlib.h:86:3: error: #error "Assumed value of MB_LEN_MAX wrong"
   86 | # error "Assumed value of MB_LEN_MAX wrong"
      |   ^~~~~
In file included from /mnt/lfs/usr/include/stdlib.h:1159,
                 from ./stdlib.h:36,
                 from c-stack.c:44:
/mnt/lfs/usr/include/bits/stdlib.h: In function 'wctomb':
/mnt/lfs/usr/include/bits/stdlib.h:86:3: error: #error "Assumed value of MB_LEN_MAX wrong"
   86 | # error "Assumed value of MB_LEN_MAX wrong"
      |   ^~~~~
  CC       c-strcasecmp.o
  CC       c-strncasecmp.o
  CC       canonicalize.o
make[3]: *** [Makefile:2866: c-stack.o] Error 1
make[3]: *** Waiting for unfinished jobs....
make[3]: *** [Makefile:2866: openat-proc.o] Error 1
...
```
There is an FAQ about it in https://linuxfromscratch.org/lfs/faq.html#m4-mb-len-max-wrong , untar gcc and generate limits.h again fixes it
```bash
lfs:/mnt/lfs/sources$ tar xf gcc-13.2.0.tar.xz
lfs:/mnt/lfs/sources$ cd gcc-13.2.0
lfs:/mnt/lfs$ ls `dirname $($LFS_TGT-gcc -print-libgcc-file-name)`/include/limits.h
/mnt/lfs/tools/lib/gcc/x86_64-lfs-linux-gnu/13.2.0/include/limits.h
lfs:/mnt/lfs$ cp `dirname $($LFS_TGT-gcc -print-libgcc-file-name)`/include/limits.h /tmp/
lfs:/mnt/lfs/sources/gcc-13.2.0$ cat gcc/limitx.h gcc/glimits.h gcc/limity.h
 > \
>   `dirname $($LFS_TGT-gcc -print-libgcc-file-name)`/include/limits.h
lfs:/mnt/lfs$ diff `dirname $($LFS_TGT-gcc -print-libgcc-file-name)`/include/limits.h /tmp/limits.h
1,35d0
< /* Copyright (C) 1992-2023 Free Software Foundation, Inc.
<
< This file is part of GCC.
<
< GCC is free software; you can redistribute it and/or modify it under
< the terms of the GNU General Public License as published by the Free
< Software Foundation; either version 3, or (at your option) any later
< version.
<
< GCC is distributed in the hope that it will be useful, but WITHOUT ANY
< WARRANTY; without even the implied warranty of MERCHANTABILITY or
< FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
< for more details.
<
< Under Section 7 of GPL version 3, you are granted additional
< permissions described in the GCC Runtime Library Exception, version
< 3.1, as published by the Free Software Foundation.
<
< You should have received a copy of the GNU General Public License and
< a copy of the GCC Runtime Library Exception along with this program;
< see the files COPYING3 and COPYING.RUNTIME respectively.  If not, see
< <http://www.gnu.org/licenses/>.  */
<
< /* This administrivia gets added to the beginning of limits.h
<    if the system has its own version of limits.h.  */
<
< /* We use _GCC_LIMITS_H_ because we want this not to match
<    any macros that the system's limits.h uses for its own purposes.  */
< #ifndef _GCC_LIMITS_H_  /* Terminated in limity.h.  */
< #define _GCC_LIMITS_H_
<
< #ifndef _LIBC_LIMITS_H_
< /* Use "..." so that we find syslimits.h only in this same directory.  */
< #include "syslimits.h"
< #endif
199,208d163
< /* This administrivia gets added to the end of limits.h
<    if the system has its own version of limits.h.  */
<
< #else /* not _GCC_LIMITS_H_ */
<
< #ifdef _GCC_NEXT_LIMITS_H
< #include_next <limits.h>              /* recurse down to the real one */
< #endif
<
< #endif /* not _GCC_LIMITS_H_ */
lfs:/mnt/lfs$
lfs:/mnt/lfs/sources/gcc-13.2.0$ cd ../m4-1.4.19
lfs:/mnt/lfs/sources/m4-1.4.19$ make
lfs:/mnt/lfs/sources/m4-1.4.19$ make DESTDIR=$LFS install
```
### 6.3 Ncurses 
```bash
lfs:/mnt/lfs/sources$ tar xf ncurses-6.4-20230520.tar.xz
lfs:/mnt/lfs/sources$ cd ncurses-6.4-20230520
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$ sed -i s/mawk// configure
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$ mkdir build
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$ pushd build
/mnt/lfs/sources/ncurses-6.4-20230520/build /mnt/lfs/sources/ncurses-6.4-20230520
lfs:/mnt/lfs/sources/ncurses-6.4-20230520/build$   ../configure
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$ history 10
  286  tar xf ncurses-6.4-20230520.tar.xz
  287  cd ncurses-6.4-20230520
  288  sed -i s/mawk// configure
  289  mkdir build
  290  pushd build
  291    ../configure
  292    make -C include
  293    make -C progs tic
  294  popd
  295  history 10
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$ ./configure --prefix=/usr                \
>             --host=$LFS_TGT              \
>             --build=$(./config.guess)    \
>             --mandir=/usr/share/man      \
>             --with-manpage-format=normal \
>             --with-shared                \
>             --without-normal             \
>             --with-cxx-shared            \
>             --without-debug              \
>             --without-ada                \
>             --disable-stripping          \
>             --enable-widec
...
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$ make
...
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$ make DESTDIR=$LFS TIC_PATH=$(pwd)/build/progs/tic install
...
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$ ln -sv libncursesw.so $LFS/usr/lib/libncurses.so
'/mnt/lfs/usr/lib/libncurses.so' -> 'libncursesw.so'
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$
lfs:/mnt/lfs/sources/ncurses-6.4-20230520$ sed -e 's/^#if.*XOPEN.*$/#if 1/' \
>     -i $LFS/usr/include/curses.h
```
### 6.4 Bash-5.2.21
```bash
lfs:/mnt/lfs/sources$ tar xf bash-5.2.21.tar.gz
lfs:/mnt/lfs/sources$ cd bash-5.2.21
lfs:/mnt/lfs/sources/bash-5.2.21$ ./configure --prefix=/usr                      \
>             --build=$(sh support/config.guess) \
>             --host=$LFS_TGT                    \
>             --without-bash-malloc
lfs:/mnt/lfs/sources/bash-5.2.21$ make
...
lfs:/mnt/lfs/sources/bash-5.2.21$ make DESTDIR=$LFS install
...
lfs:/mnt/lfs/sources/bash-5.2.21$ ln -sv bash $LFS/bin/sh
'/mnt/lfs/bin/sh' -> 'bash'
lfs:/mnt/lfs/sources/bash-5.2.21$
```
### 6.5 Coreutils-9.4
```bash
lfs:/mnt/lfs/sources$ tar xf coreutils-9.4.tar.xz
lfs:/mnt/lfs/sources$ cd coreutils-9.4
lfs:/mnt/lfs/sources/coreutils-9.4$ ./configure --prefix=/usr                     \
>             --host=$LFS_TGT                   \
>             --build=$(build-aux/config.guess) \
>             --enable-install-program=hostname \
>             --enable-no-install-program=kill,uptime
...
lfs:/mnt/lfs/sources/coreutils-9.4$ make
...
lfs:/mnt/lfs/sources/coreutils-9.4$ make DESTDIR=$LFS install
...
lfs:/mnt/lfs/sources/coreutils-9.4$ mv -v $LFS/usr/bin/chroot              $LFS/usr/sbin
renamed '/mnt/lfs/usr/bin/chroot' -> '/mnt/lfs/usr/sbin/chroot'
lfs:/mnt/lfs/sources/coreutils-9.4$ mkdir -pv $LFS/usr/share/man/man8
mkdir: created directory '/mnt/lfs/usr/share/man/man8'
lfs:/mnt/lfs/sources/coreutils-9.4$ mv -v $LFS/usr/share/man/man1/chroot.1 $LFS/usr/share/man/man8/chroot.8
renamed '/mnt/lfs/usr/share/man/man1/chroot.1' -> '/mnt/lfs/usr/share/man/man8/chroot.8'
lfs:/mnt/lfs/sources/coreutils-9.4$ sed -i 's/"1"/"8"/'                    $LFS/usr/share/man/man8/chroot.8
lfs:/mnt/lfs/sources/coreutils-9.4$
```
### 6.6 Diffutils-3.10
```bash
lfs:/mnt/lfs/sources$ tar xf diffutils-3.10.tar.xz
lfs:/mnt/lfs/sources$ cd diffutils-3.10
lfs:/mnt/lfs/sources/diffutils-3.10$ ./configure --prefix=/usr   \
>             --host=$LFS_TGT \
>             --build=$(./build-aux/config.guess)
...
lfs:/mnt/lfs/sources/diffutils-3.10$ make
...
lfs:/mnt/lfs/sources/diffutils-3.10$ make DESTDIR=$LFS install
...
```
### 6.7 File-5.45
```bash
lfs:/mnt/lfs/sources$ tar xf file-5.45.tar.gz
lfs:/mnt/lfs/sources$ cd file-5.45
lfs:/mnt/lfs/sources/file-5.45$ mkdir build
lfs:/mnt/lfs/sources/file-5.45$ pushd build
/mnt/lfs/sources/file-5.45/build /mnt/lfs/sources/file-5.45 /mnt/lfs/sources
lfs:/mnt/lfs/sources/file-5.45/build$   ../configure --disable-bzlib      \
>                --disable-libseccomp \
>                --disable-xzlib      \
>                --disable-zlib
...
lfs:/mnt/lfs/sources/file-5.45/build$ make
...
lfs:/mnt/lfs/sources/file-5.45/build$ popd
/mnt/lfs/sources/file-5.45 /mnt/lfs/sources
lfs:/mnt/lfs/sources/file-5.45$
lfs:/mnt/lfs/sources/file-5.45$ ./configure --prefix=/usr --host=$LFS_TGT --build=$(./config.guess)
...
lfs:/mnt/lfs/sources/file-5.45$ make FILE_COMPILE=$(pwd)/build/src/file
...
lfs:/mnt/lfs/sources/file-5.45$ make DESTDIR=$LFS install
...
lfs:/mnt/lfs/sources/file-5.45$ rm -v $LFS/usr/lib/libmagic.la
removed '/mnt/lfs/usr/lib/libmagic.la'
lfs:/mnt/lfs/sources/file-5.45$
```
### 6.8 FindUtils-4.9.0
```bash
lfs:/mnt/lfs/sources$ tar xf findutils-4.9.0.tar.xz
lfs:/mnt/lfs/sources$ cd findutils-4.9.0
lfs:/mnt/lfs/sources/findutils-4.9.0$ ./configure --prefix=/usr                   \
>             --localstatedir=/var/lib/locate \
>             --host=$LFS_TGT                 \
>             --build=$(build-aux/config.guess)
...
lfs:/mnt/lfs/sources/findutils-4.9.0$ make
...
lfs:/mnt/lfs/sources/findutils-4.9.0$ make DESTDIR=$LFS install
...
```
### 6.9 Gawk-5.3.0
```bash
lfs:/mnt/lfs/sources$ tar xf gawk-5.3.0.tar.xz
lfs:/mnt/lfs/sources$ cd gawk
bash: cd: gawk: No such file or directory
lfs:/mnt/lfs/sources$ cd gawk-5.3.0
lfs:/mnt/lfs/sources/gawk-5.3.0$ sed -i 's/extras//' Makefile.in
lfs:/mnt/lfs/sources/gawk-5.3.0$ ./configure --prefix=/usr   \
>             --host=$LFS_TGT \
>             --build=$(build-aux/config.guess)
...
lfs:/mnt/lfs/sources/gawk-5.3.0$ make
...
lfs:/mnt/lfs/sources/gawk-5.3.0$ make DESTDIR=$LFS install
...
```
### 6.10 Grep-3.11
```bash
lfs:/mnt/lfs/sources$ tar xf grep-3.11.tar.xz
lfs:/mnt/lfs/sources$ cd grep-3.11
lfs:/mnt/lfs/sources/grep-3.11$ ./configure --prefix=/usr   \
>             --host=$LFS_TGT \
>             --build=$(./build-aux/config.guess)
lfs:/mnt/lfs/sources/grep-3.11$ make
...
lfs:/mnt/lfs/sources/grep-3.11$ make DESTDIR=$LFS install
...
```
### 6.11 Gzip-1.13
```bash
lfs:/mnt/lfs/sources$ tar xf gzip-1.13.tar.xz
lfs:/mnt/lfs/sources$ cd gzip-1.13
lfs:/mnt/lfs/sources/gzip-1.13$
lfs:/mnt/lfs/sources/gzip-1.13$ ./configure --prefix=/usr --host=$LFS_TGT
...
lfs:/mnt/lfs/sources/gzip-1.13$ make
...
lfs:/mnt/lfs/sources/gzip-1.13$ make DESTDIR=$LFS install
...
```
### 6.12 Make-4.4.1
```bash
lfs:/mnt/lfs/sources$ tar xf make-4.4.1.tar.gz
lfs:/mnt/lfs/sources$ cd make-4.4.1
lfs:/mnt/lfs/sources/make-4.4.1$
lfs:/mnt/lfs/sources/make-4.4.1$ ./configure --prefix=/usr   \
>             --without-guile \
>             --host=$LFS_TGT \
>             --build=$(build-aux/config.guess)
...
lfs:/mnt/lfs/sources/make-4.4.1$ make
...
lfs:/mnt/lfs/sources/make-4.4.1$ make DESTDIR=$LFS install
...
```
### 6.13 Patch-2.7.6
```bash
lfs:/mnt/lfs/sources$ tar xf patch-2.7.6.tar.xz
lfs:/mnt/lfs/sources$ cd patch-2.7.6
lfs:/mnt/lfs/sources/patch-2.7.6$ ./configure --prefix=/usr   \
>             --host=$LFS_TGT \
>             --build=$(build-aux/config.guess)
...
lfs:/mnt/lfs/sources/patch-2.7.6$ make
...
lfs:/mnt/lfs/sources/patch-2.7.6$ make DESTDIR=$LFS install
...
```
### 6.14 Sed-4.9
```bash
lfs:/mnt/lfs/sources$ tar xf sed-4.9.tar.xz
lfs:/mnt/lfs/sources$ cd sed-4.9
lfs:/mnt/lfs/sources/sed-4.9$ ./configure --prefix=/usr   \
>             --host=$LFS_TGT \
>             --build=$(./build-aux/config.guess)
...
lfs:/mnt/lfs/sources/sed-4.9$ make
...
lfs:/mnt/lfs/sources/sed-4.9$ make DESTDIR=$LFS install
...
```
### 6.15 Tar-1.35
```bash
lfs:/mnt/lfs/sources$ tar xf tar-1.35.tar.xz
lfs:/mnt/lfs/sources$ cd tar-1.35
lfs:/mnt/lfs/sources/tar-1.35$ ./configure --prefix=/usr                     \
>             --host=$LFS_TGT                   \
>             --build=$(build-aux/config.guess)
...
lfs:/mnt/lfs/sources/tar-1.35$ make
...
lfs:/mnt/lfs/sources/tar-1.35$ make DESTDIR=$LFS install
...
```
### 6.16 Xz-5.4.6
```bash
lfs:/mnt/lfs/sources$ tar xf xz-5.4.6.tar.xz
lfs:/mnt/lfs/sources$ cd xz-5.4.6
lfs:/mnt/lfs/sources/xz-5.4.6$ ./configure --prefix=/usr                     \
>             --host=$LFS_TGT                   \
>             --build=$(build-aux/config.guess) \
>             --disable-static                  \
>             --docdir=/usr/share/doc/xz-5.4.6
...
lfs:/mnt/lfs/sources/xz-5.4.6$ make
...
lfs:/mnt/lfs/sources/xz-5.4.6$ make DESTDIR=$LFS install
...
lfs:/mnt/lfs/sources/xz-5.4.6$ rm -v $LFS/usr/lib/liblzma.la
removed '/mnt/lfs/usr/lib/liblzma.la'
lfs:/mnt/lfs/sources/xz-5.4.6$
```
### 6.17 Binutils-2.42 - Pass 2
```bash
lfs:/mnt/lfs/sources/binutils-2.42$ sed '6009s/$add_dir//' -i ltmain.sh
lfs:/mnt/lfs/sources/binutils-2.42$ du -sh build
183M    build
lfs:/mnt/lfs/sources/binutils-2.42$ rm -rf build
lfs:/mnt/lfs/sources/binutils-2.42$ mkdir -v build
mkdir: created directory 'build'
lfs:/mnt/lfs/sources/binutils-2.42$ cd       build
lfs:/mnt/lfs/sources/binutils-2.42/build$ ../configure                   \
>     --prefix=/usr              \
>     --build=$(../config.guess) \
>     --host=$LFS_TGT            \
>     --disable-nls              \
>     --enable-shared            \
>     --enable-gprofng=no        \
>     --disable-werror           \
>     --enable-64-bit-bfd        \
>     --enable-default-hash-style=gnu
...
lfs:/mnt/lfs/sources/binutils-2.42/build$ make
...
lfs:/mnt/lfs/sources/binutils-2.42/build$ make DESTDIR=$LFS install
...
lfs:/mnt/lfs/sources/binutils-2.42/build$ rm -v $LFS/usr/lib/lib{bfd,ctf,ctf-nobfd,opcodes,sframe}.{a,la}
removed '/mnt/lfs/usr/lib/libbfd.a'
removed '/mnt/lfs/usr/lib/libbfd.la'
removed '/mnt/lfs/usr/lib/libctf.a'
removed '/mnt/lfs/usr/lib/libctf.la'
removed '/mnt/lfs/usr/lib/libctf-nobfd.a'
removed '/mnt/lfs/usr/lib/libctf-nobfd.la'
removed '/mnt/lfs/usr/lib/libopcodes.a'
removed '/mnt/lfs/usr/lib/libopcodes.la'
removed '/mnt/lfs/usr/lib/libsframe.a'
removed '/mnt/lfs/usr/lib/libsframe.la'
lfs:/mnt/lfs/sources/binutils-2.42/build$
```
### 6.18 GCC-13.2.0 - Pass 2
```bash
lfs:/mnt/lfs/sources/gcc-13.2.0$ tar -xf ../mpfr-4.2.1.tar.xz
lfs:/mnt/lfs/sources/gcc-13.2.0$ mv -v mpfr-4.2.1 mpfr
renamed 'mpfr-4.2.1' -> 'mpfr/mpfr-4.2.1'
lfs:/mnt/lfs/sources/gcc-13.2.0$ tar -xf ../gmp-6.3.0.tar.xz
lfs:/mnt/lfs/sources/gcc-13.2.0$ mv -v gmp-6.3.0 gmp
renamed 'gmp-6.3.0' -> 'gmp/gmp-6.3.0'
lfs:/mnt/lfs/sources/gcc-13.2.0$ tar -xf ../mpc-1.3.1.tar.gz
lfs:/mnt/lfs/sources/gcc-13.2.0$ mv -v mpc-1.3.1 mpc
renamed 'mpc-1.3.1' -> 'mpc/mpc-1.3.1'
lfs:/mnt/lfs/sources/gcc-13.2.0$ case $(uname -m) in
>   x86_64)
>     sed -e '/m64=/s/lib64/lib/' \
>         -i.orig gcc/config/i386/t-linux64
>   ;;
> esac
lfs:/mnt/lfs/sources/gcc-13.2.0$
lfs:/mnt/lfs/sources/gcc-13.2.0$ sed '/thread_header =/s/@.*@/gthr-posix.h/' \
>     -i libgcc/Makefile.in libstdc++-v3/include/Makefile.in
lfs:/mnt/lfs/sources/gcc-13.2.0$ ld -d build
ld: read in flex scanner failed
lfs:/mnt/lfs/sources/gcc-13.2.0$ ls -d build
build
lfs:/mnt/lfs/sources/gcc-13.2.0$ rm -rf build
lfs:/mnt/lfs/sources/gcc-13.2.0$ mkdir -v build
mkdir: created directory 'build'
lfs:/mnt/lfs/sources/gcc-13.2.0$ cd       build
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ ../configure                                       \
>     --build=$(../config.guess)                     \
>     --host=$LFS_TGT                                \
>     --target=$LFS_TGT                              \
>     LDFLAGS_FOR_TARGET=-L$PWD/$LFS_TGT/libgcc      \
>     --prefix=/usr                                  \
>     --with-build-sysroot=$LFS                      \
>     --enable-default-pie                           \
>     --enable-default-ssp                           \
>     --disable-nls                                  \
>     --disable-multilib                             \
>     --disable-libatomic                            \
>     --disable-libgomp                              \
>     --disable-libquadmath                          \
>     --disable-libsanitizer                         \
>     --disable-libssp                               \
>     --disable-libvtv                               \
>     --enable-languages=c,c++
...
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ make
...
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ make DESTDIR=$LFS install
...
lfs:/mnt/lfs/sources/gcc-13.2.0/build$ ln -sv gcc $LFS/usr/bin/cc
'/mnt/lfs/usr/bin/cc' -> 'gcc'
lfs:/mnt/lfs/sources/gcc-13.2.0/build$
```
## 7. Entering Chroot and Building Additional Temporary Tools

### 7.2 Changing Ownership
```bash
bash-5.2# chown -R root:root $LFS/{usr,lib,var,etc,bin,sbin,tools}
bash-5.2# case $(uname -m) in
>   x86_64) chown -R root:root $LFS/lib64 ;;
> esac
```
### 7.3 Preparing Virtual Kernel File Systems
```bash
bash-5.2# mkdir -pv $LFS/{dev,proc,sys,run}
mkdir: created directory '/mnt/lfs/dev'
mkdir: created directory '/mnt/lfs/proc'
mkdir: created directory '/mnt/lfs/sys'
mkdir: created directory '/mnt/lfs/run'
bash-5.2#
```
### 7.3.1 Mounting and Populating /dev/
```bash
bash-5.2# mount -v --bind /dev $LFS/dev
mount: /dev bound on /mnt/lfs/dev.
bash-5.2#
```
#### 7.3.2 Mounting Virtual Kernel File Systems
```bash
bash-5.2# mount -vt devpts devpts -o gid=5,mode=0620 $LFS/dev/pts
mount: devpts mounted on /mnt/lfs/dev/pts.
bash-5.2# mount -vt proc proc $LFS/proc
mount: proc mounted on /mnt/lfs/proc.
bash-5.2# mount -vt sysfs sysfs $LFS/sys
mount: sysfs mounted on /mnt/lfs/sys.
bash-5.2# mount -vt tmpfs tmpfs $LFS/run
mount: tmpfs mounted on /mnt/lfs/run.
bash-5.2#
bash-5.2# if [ -h $LFS/dev/shm ]; then
>   install -v -d -m 1777 $LFS$(realpath /dev/shm)
> else
>   mount -vt tmpfs -o nosuid,nodev tmpfs $LFS/dev/shm
> fi
mount: tmpfs mounted on /mnt/lfs/dev/shm.
bash-5.2#
```
### 7.4 Entering the Chroot Environment
```bash
bash-5.2# chroot "$LFS" /usr/bin/env -i   \
>     HOME=/root                  \
>     TERM="$TERM"                \
>     PS1='(lfs chroot) \u:\w\$ ' \
>     PATH=/usr/bin:/usr/sbin     \
>     MAKEFLAGS="-j$(nproc)"      \
>     TESTSUITEFLAGS="-j$(nproc)" \
>     /bin/bash --login
(lfs chroot) I have no name!:/#
```
### 7.5 Creating Directories
```bash
(lfs chroot) I have no name!:/# mkdir -pv /{boot,home,mnt,opt,srv}
mkdir: created directory '/mnt'
mkdir: created directory '/srv'
(lfs chroot) I have no name!:/#
(lfs chroot) I have no name!:/# mkdir -pv /etc/{opt,sysconfig}
mkdir: created directory '/etc/opt'
mkdir: created directory '/etc/sysconfig'
(lfs chroot) I have no name!:/# mkdir -pv /lib/firmware
mkdir: created directory '/lib/firmware'
(lfs chroot) I have no name!:/# mkdir -pv /media/{floppy,cdrom}
mkdir: created directory '/media'
mkdir: created directory '/media/floppy'
mkdir: created directory '/media/cdrom'
(lfs chroot) I have no name!:/# mkdir -pv /usr/{,local/}{include,src}
mkdir: created directory '/usr/local'
mkdir: created directory '/usr/local/include'
mkdir: created directory '/usr/local/src'
(lfs chroot) I have no name!:/# mkdir -pv /usr/local/{bin,lib,sbin}
mkdir: created directory '/usr/local/bin'
mkdir: created directory '/usr/local/lib'
mkdir: created directory '/usr/local/sbin'
(lfs chroot) I have no name!:/# mkdir -pv /usr/{,local/}share/{color,dict,doc,info,locale,man}
mkdir: created directory '/usr/share/color'
mkdir: created directory '/usr/share/dict'
mkdir: created directory '/usr/local/share'
mkdir: created directory '/usr/local/share/color'
mkdir: created directory '/usr/local/share/dict'
mkdir: created directory '/usr/local/share/doc'
mkdir: created directory '/usr/local/share/info'
mkdir: created directory '/usr/local/share/locale'
mkdir: created directory '/usr/local/share/man'
(lfs chroot) I have no name!:/# mkdir -pv /usr/{,local/}share/{misc,terminfo,zoneinfo}
mkdir: created directory '/usr/share/zoneinfo'
mkdir: created directory '/usr/local/share/misc'
mkdir: created directory '/usr/local/share/terminfo'
mkdir: created directory '/usr/local/share/zoneinfo'
(lfs chroot) I have no name!:/# mkdir -pv /usr/{,local/}share/man/man{1..8}
mkdir: created directory '/usr/share/man/man2'
mkdir: created directory '/usr/share/man/man6'
mkdir: created directory '/usr/local/share/man/man1'
mkdir: created directory '/usr/local/share/man/man2'
mkdir: created directory '/usr/local/share/man/man3'
mkdir: created directory '/usr/local/share/man/man4'
mkdir: created directory '/usr/local/share/man/man5'
mkdir: created directory '/usr/local/share/man/man6'
mkdir: created directory '/usr/local/share/man/man7'
mkdir: created directory '/usr/local/share/man/man8'
(lfs chroot) I have no name!:/# mkdir -pv /var/{cache,local,log,mail,opt,spool}
mkdir: created directory '/var/cache'
mkdir: created directory '/var/local'
mkdir: created directory '/var/log'
mkdir: created directory '/var/mail'
mkdir: created directory '/var/opt'
mkdir: created directory '/var/spool'
(lfs chroot) I have no name!:/# mkdir -pv /var/lib/{color,misc,locate}
mkdir: created directory '/var/lib/color'
mkdir: created directory '/var/lib/misc'
(lfs chroot) I have no name!:/#
(lfs chroot) I have no name!:/# ln -sfv /run /var/run
'/var/run' -> '/run'
(lfs chroot) I have no name!:/# ln -sfv /run/lock /var/lock
'/var/lock' -> '/run/lock'
(lfs chroot) I have no name!:/#
(lfs chroot) I have no name!:/# install -dv -m 0750 /root
install: creating directory '/root'
(lfs chroot) I have no name!:/# install -dv -m 1777 /tmp /var/tmp
install: creating directory '/var/tmp'
(lfs chroot) I have no name!:/#
```
#### 7.5.1 FHS Compliance Note

### 7.6 Creating Essential Files and Symlinks
```bash
(lfs chroot) I have no name!:/# ln -sv /proc/self/mounts /etc/mtab
'/etc/mtab' -> '/proc/self/mounts'
(lfs chroot) I have no name!:/#
(lfs chroot) I have no name!:/# cat > /etc/hosts << EOF
> 127.0.0.1  localhost $(hostname)
> ::1        localhost
> EOF
(lfs chroot) I have no name!:/#
(lfs chroot) I have no name!:/# cat > /etc/passwd << "EOF"
> root:x:0:0:root:/root:/bin/bash
> bin:x:1:1:bin:/dev/null:/usr/bin/false
> daemon:x:6:6:Daemon User:/dev/null:/usr/bin/false
> messagebus:x:18:18:D-Bus Message Daemon User:/run/dbus:/usr/bin/false
> uuidd:x:80:80:UUID Generation Daemon User:/dev/null:/usr/bin/false
> nobody:x:65534:65534:Unprivileged User:/dev/null:/usr/bin/false
> EOF
(lfs chroot) I have no name!:/#
(lfs chroot) I have no name!:/# cat > /etc/group << "EOF"
> root:x:0:
> bin:x:1:daemon
> sys:x:2:
> kmem:x:3:
> tape:x:4:
> tty:x:5:
> daemon:x:6:
> floppy:x:7:
> disk:x:8:
> lp:x:9:
> dialout:x:10:
> audio:x:11:
> video:x:12:
> utmp:x:13:
> cdrom:x:15:
> adm:x:16:
> messagebus:x:18:
> input:x:24:
> mail:x:34:
> kvm:x:61:
> uuidd:x:80:
> wheel:x:97:
> users:x:999:
> nogroup:x:65534:
> EOF
(lfs chroot) I have no name!:/#
(lfs chroot) I have no name!:/# echo "tester:x:101:101::/home/tester:/bin/bash" >> /etc/passwd
(lfs chroot) I have no name!:/# echo "tester:x:101:" >> /etc/group
(lfs chroot) I have no name!:/# install -o tester -d /home/tester
(lfs chroot) I have no name!:/#
(lfs chroot) I have no name!:/# exec /usr/bin/bash --login
(lfs chroot) root:/# touch /var/log/{btmp,lastlog,faillog,wtmp}
(lfs chroot) root:/# chgrp -v utmp /var/log/lastlog
changed group of '/var/log/lastlog' from root to utmp
(lfs chroot) root:/# chmod -v 664  /var/log/lastlog
mode of '/var/log/lastlog' changed from 0644 (rw-r--r--) to 0664 (rw-rw-r--)
(lfs chroot) root:/# chmod -v 600  /var/log/btmp
mode of '/var/log/btmp' changed from 0644 (rw-r--r--) to 0600 (rw-------)
(lfs chroot) root:/#
```
### 7.7 Gettext-0.22.4
```bash
(lfs chroot) root:/sources# tar xf gettext-0.22.4.tar.xz
(lfs chroot) root:/sources# cd gettext-0.22.4
(lfs chroot) root:/sources/gettext-0.22.4# ./configure --disable-shared
...
(lfs chroot) root:/sources/gettext-0.22.4# make
...
(lfs chroot) root:/sources/gettext-0.22.4# cp -v gettext-tools/src/{msgfmt,msgmerge,xgettext} /usr/bin
'gettext-tools/src/msgfmt' -> '/usr/bin/msgfmt'
'gettext-tools/src/msgmerge' -> '/usr/bin/msgmerge'
'gettext-tools/src/xgettext' -> '/usr/bin/xgettext'
(lfs chroot) root:/sources/gettext-0.22.4#
```
### 7.8 Bison-3.8.2
```bash
(lfs chroot) root:/sources# tar xf bison-3.8.2.tar.xz
(lfs chroot) root:/sources# cd bison-3.8.2
(lfs chroot) root:/sources/bison-3.8.2# ./configure --prefix=/usr \
>             --docdir=/usr/share/doc/bison-3.8.2
(lfs chroot) root:/sources/bison-3.8.2# make 
...
(lfs chroot) root:/sources/bison-3.8.2# make install
...
```
### 7.9 Perl-5.38.2
```bash
(lfs chroot) root:/sources# tar xf perl-5.38.2.tar.xz
(lfs chroot) root:/sources# cd perl-5.38.2
(lfs chroot) root:/sources/perl-5.38.2# sh Configure -des                                        \
>              -Dprefix=/usr                               \
>              -Dvendorprefix=/usr                         \
>              -Duseshrplib                                \
>              -Dprivlib=/usr/lib/perl5/5.38/core_perl     \
>              -Darchlib=/usr/lib/perl5/5.38/core_perl     \
>              -Dsitelib=/usr/lib/perl5/5.38/site_perl     \
>              -Dsitearch=/usr/lib/perl5/5.38/site_perl    \
>              -Dvendorlib=/usr/lib/perl5/5.38/vendor_perl \
>              -Dvendorarch=/usr/lib/perl5/5.38/vendor_perl
...
(lfs chroot) root:/sources/perl-5.38.2# make
...
(lfs chroot) root:/sources/perl-5.38.2# make install
...
```
### 7.10 Python-3.12.2
```bash
(lfs chroot) root:/sources# tar xf Python-3.12.2.tar.xz
(lfs chroot) root:/sources# cd Python-3.12.2
(lfs chroot) root:/sources/Python-3.12.2# ./configure --prefix=/usr   \
>             --enable-shared \
>             --without-ensurepip
...
(lfs chroot) root:/sources/Python-3.12.2# make
...
(lfs chroot) root:/sources/Python-3.12.2# make install
...
```
### 7.11 Texinfo-7.1
```bash
(lfs chroot) root:/sources# tar xf texinfo-7.1.tar.xz
(lfs chroot) root:/sources# cd texinfo-7.1
(lfs chroot) root:/sources/texinfo-7.1# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/texinfo-7.1# make
...
(lfs chroot) root:/sources/texinfo-7.1# make install
...
```
### 7.12 Util-linux-2.39.3
```bash
(lfs chroot) root:/sources# mkdir -pv /var/lib/hwclock
mkdir: created directory '/var/lib/hwclock'
(lfs chroot) root:/sources# tar xf util-linux-2.39.3.tar.xz
cd (lfs chroot) root:/sources# cd util-linux-2.39.3
(lfs chroot) root:/sources/util-linux-2.39.3# ./configure --libdir=/usr/lib    \
>             --runstatedir=/run   \
>             --disable-chfn-chsh  \
>             --disable-login      \
>             --disable-nologin    \
>             --disable-su         \
>             --disable-setpriv    \
>             --disable-runuser    \
>             --disable-pylibmount \
>             --disable-static     \
>             --without-python     \
>             ADJTIME_PATH=/var/lib/hwclock/adjtime \
>             --docdir=/usr/share/doc/util-linux-2.39.3
...
(lfs chroot) root:/sources/util-linux-2.39.3# make
...
(lfs chroot) root:/sources/util-linux-2.39.3# make install
...
```
### 7.13 Cleaning up and Saving the Temporary System

#### 7.13.1 Cleaning
```bash
(lfs chroot) root:/sources# rm -rf /usr/share/{info,man,doc}/*
(lfs chroot) root:/sources# find /usr/{lib,libexec} -name \*.la -delete
(lfs chroot) root:/sources# rm -rf /tools
(lfs chroot) root:/sources#
```
#### 7.13.2 Backup
```bash
(lfs chroot) root:/sources#
logout
bash-5.2#
bash-5.2# mountpoint -q $LFS/dev/shm && umount $LFS/dev/shm
bash-5.2# umount $LFS/dev/pts
bash-5.2# umount $LFS/{sys,proc,run,dev}
bash-5.2# echo $LFS
/mnt/lfs
bash-5.2#
bash-5.2# cd $LFS
bash-5.2# ls
bin   dev  home  lib64       media  opt   root  sbin     srv  tmp  var
boot  etc  lib   lost+found  mnt    proc  run   sources  sys  usr
bash-5.2# pwd
/mnt/lfs
bash-5.2# date
Mon May 20 10:14:44 PM CST 2024
bash-5.2#
bash-5.2# du -sh /mnt/lfs
12G     /mnt/lfs
bash-5.2#
bash-5.2# tar -cJpf $HOME/lfs-temp-tools-12.1.tar.xz .
bash-5.2# du -sh /root/lfs-temp-tools-12.1.tar.xz
2.2G    /root/lfs-temp-tools-12.1.tar.xz
bash-5.2#
```
## 8. Installing Basic System Software

### 8.3 Man-pages-6.06
```bash
bash-5.2# history 10
  537  removed 'man3/crypt.3'
  538  removed 'man3/crypt_r.3'
  539
  540  mount -v --bind /dev $LFS/dev
  541  mount -vt devpts devpts -o gid=5,mode=0620 $LFS/dev/pts
  542  mount -vt proc proc $LFS/proc
  543  mount -vt sysfs sysfs $LFS/sys
  544  mount -vt tmpfs tmpfs $LFS/run
  545  mount -vt tmpfs -o nosuid,nodev tmpfs $LFS/dev/shm
  546  history 10
bash-5.2# chroot "$LFS" /usr/bin/env -i       HOME=/root                      TERM="$TERM"                    PS1='(lfs chroot) \u:\w\$ '     PATH=/usr/bin:/usr/sbin         MAKEFLAGS="-j$(nproc)"          TESTSUITEFLAGS="-j$(nproc)"     /bin/bash --login
(lfs chroot) root:/sources# tar xf man-pages-6.06.tar.xz
(lfs chroot) root:/sources# cd man-pages-6.06
(lfs chroot) root:/sources/man-pages-6.06# rm -v man3/crypt*
removed 'man3/crypt.3'
removed 'man3/crypt_r.3'
(lfs chroot) root:/sources/man-pages-6.06# make prefix=/usr install
```
### 8.4 Iana-Etc-20240125
```bash
(lfs chroot) root:/sources# tar xf iana-etc-20240125.tar.gz
(lfs chroot) root:/sources# cd iana-etc-20240125
(lfs chroot) root:/sources/iana-etc-20240125# cp services protocols /etc
(lfs chroot) root:/sources/iana-etc-20240125#
```
### 8.5 Glibc-2.39
```bash
(lfs chroot) root:/sources/glibc-2.39# patch -Np1 -i ../glibc-2.39-fhs-1.patch
patching file Makeconfig
Reversed (or previously applied) patch detected!  Skipping patch.
1 out of 1 hunk ignored -- saving rejects to file Makeconfig.rej
patching file nscd/nscd.h
Reversed (or previously applied) patch detected!  Skipping patch.
1 out of 1 hunk ignored -- saving rejects to file nscd/nscd.h.rej
patching file nss/db-Makefile
Reversed (or previously applied) patch detected!  Skipping patch.
1 out of 1 hunk ignored -- saving rejects to file nss/db-Makefile.rej
patching file sysdeps/generic/paths.h
Reversed (or previously applied) patch detected!  Skipping patch.
1 out of 1 hunk ignored -- saving rejects to file sysdeps/generic/paths.h.rej
patching file sysdeps/unix/sysv/linux/paths.h
Reversed (or previously applied) patch detected!  Skipping patch.
1 out of 1 hunk ignored -- saving rejects to file sysdeps/unix/sysv/linux/paths.h.rej
(lfs chroot) root:/sources/glibc-2.39#
(lfs chroot) root:/sources/glibc-2.39# ls -d build
build
(lfs chroot) root:/sources/glibc-2.39# rm -rf build
(lfs chroot) root:/sources/glibc-2.39# mkdir -v build
mkdir: created directory 'build'
(lfs chroot) root:/sources/glibc-2.39# cd       build
(lfs chroot) root:/sources/glibc-2.39/build# echo "rootsbindir=/usr/sbin" > configparms
(lfs chroot) root:/sources/glibc-2.39/build# ../configure --prefix=/usr                            \
>              --disable-werror                         \
>              --enable-kernel=4.19                     \
>              --enable-stack-protector=strong          \
>              --disable-nscd                           \
>              libc_cv_slibdir=/usr/lib
...
(lfs chroot) root:/sources/glibc-2.39/build# make
...
```
I ignore some fails 
```bash
(lfs chroot) root:/sources/glibc-2.39/build# make check
...
FAIL: io/tst-lchmod
...
FAIL: math/test-double-vlen4-avx2-tan
...
FAIL: math/test-float-vlen8-avx2-acos
...
                === Summary of results ===
      3 FAIL
   5135 PASS
    132 UNSUPPORTED
     16 XFAIL
      4 XPASS
make[1]: *** [Makefile:663: tests] Error 1
make[1]: Leaving directory '/sources/glibc-2.39'
make: *** [Makefile:9: check] Error 2
(lfs chroot) root:/sources/glibc-2.39/build# echo $?
2
(lfs chroot) root:/sources/glibc-2.39/build#
```
Continue
```bash
(lfs chroot) root:/sources/glibc-2.39/build# touch /etc/ld.so.conf
(lfs chroot) root:/sources/glibc-2.39/build# sed '/test-installation/s@$(PERL)@echo not running@' -i ../Makefile
(lfs chroot) root:/sources/glibc-2.39/build# make install
...
(lfs chroot) root:/sources/glibc-2.39/build# sed '/RTLDLIST=/s@/usr@@g' -i /usr/bin/ldd
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i C -f UTF-8 C.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i cs_CZ -f UTF-8 cs_CZ.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i de_DE -f ISO-8859-1 de_DE
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i de_DE@euro -f ISO-8859-15 de_DE@euro
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i de_DE -f UTF-8 de_DE.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i el_GR -f ISO-8859-7 el_GR
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i en_GB -f ISO-8859-1 en_GB
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i en_GB -f UTF-8 en_GB.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i en_HK -f ISO-8859-1 en_HK
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i en_PH -f ISO-8859-1 en_PH
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i en_US -f ISO-8859-1 en_US
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i en_US -f UTF-8 en_US.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i es_ES -f ISO-8859-15 es_ES@euro
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i es_MX -f ISO-8859-1 es_MX
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i fa_IR -f UTF-8 fa_IR
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i fr_FR -f ISO-8859-1 fr_FR
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i fr_FR@euro -f ISO-8859-15 fr_FR@euro
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i fr_FR -f UTF-8 fr_FR.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i is_IS -f ISO-8859-1 is_IS
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i is_IS -f UTF-8 is_IS.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i it_IT -f ISO-8859-1 it_IT
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i it_IT -f ISO-8859-15 it_IT@euro
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i it_IT -f UTF-8 it_IT.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i ja_JP -f EUC-JP ja_JP
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i ja_JP -f SHIFT_JIS ja_JP.SJIS 2> /dev/null || true
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i ja_JP -f UTF-8 ja_JP.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i nl_NL@euro -f ISO-8859-15 nl_NL@euro
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i ru_RU -f KOI8-R ru_RU.KOI8-R
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i ru_RU -f UTF-8 ru_RU.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i se_NO -f UTF-8 se_NO.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i ta_IN -f UTF-8 ta_IN.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i tr_TR -f UTF-8 tr_TR.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i zh_CN -f GB18030 zh_CN.GB18030
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i zh_HK -f BIG5-HKSCS zh_HK.BIG5-HKSCS
(lfs chroot) root:/sources/glibc-2.39/build# localedef -i zh_TW -f UTF-8 zh_TW.UTF-8
(lfs chroot) root:/sources/glibc-2.39/build#
(lfs chroot) root:/sources/glibc-2.39/build# make localedata/install-locales
```
#### 8.5.2 Configuring Glibc
```bash
(lfs chroot) root:/sources/glibc-2.39/build# cat > /etc/nsswitch.conf << "EOF"
> # Begin /etc/nsswitch.conf
> passwd: files
> group: files
> shadow: files
> hosts: files dns
> networks: files
> protocols: files
> services: files
> ethers: files
> rpc: files
> # End /etc/nsswitch.conf
> EOF
(lfs chroot) root:/sources/glibc-2.39/build# tar -xf ../../tzdata2024a.tar.gz
(lfs chroot) root:/sources/glibc-2.39/build# ZONEINFO=/usr/share/zoneinfo
(lfs chroot) root:/sources/glibc-2.39/build# mkdir -pv $ZONEINFO/{posix,right}
mkdir: created directory '/usr/share/zoneinfo/posix'
mkdir: created directory '/usr/share/zoneinfo/right'
(lfs chroot) root:/sources/glibc-2.39/build# for tz in etcetera southamerica northamerica europe africa antarctica  \
>           asia australasia backward; do
>     zic -L /dev/null   -d $ZONEINFO       ${tz}
>     zic -L /dev/null   -d $ZONEINFO/posix ${tz}
>     zic -L leapseconds -d $ZONEINFO/right ${tz}
> done
warning: "leapseconds", line 80: "#expires" is obsolescent; use "Expires"
warning: "leapseconds", line 80: "#expires" is obsolescent; use "Expires"
warning: "leapseconds", line 80: "#expires" is obsolescent; use "Expires"
warning: "leapseconds", line 80: "#expires" is obsolescent; use "Expires"
warning: "leapseconds", line 80: "#expires" is obsolescent; use "Expires"
warning: "leapseconds", line 80: "#expires" is obsolescent; use "Expires"
warning: "leapseconds", line 80: "#expires" is obsolescent; use "Expires"
warning: "leapseconds", line 80: "#expires" is obsolescent; use "Expires"
warning: "leapseconds", line 80: "#expires" is obsolescent; use "Expires"
(lfs chroot) root:/sources/glibc-2.39/build#
(lfs chroot) root:/sources/glibc-2.39/build# cp -v zone.tab zone1970.tab iso3166.tab $ZONEINFO
'zone.tab' -> '/usr/share/zoneinfo/zone.tab'
'zone1970.tab' -> '/usr/share/zoneinfo/zone1970.tab'
'iso3166.tab' -> '/usr/share/zoneinfo/iso3166.tab'
(lfs chroot) root:/sources/glibc-2.39/build# zic -d $ZONEINFO -p America/New_York
(lfs chroot) root:/sources/glibc-2.39/build# unset ZONEINFO
(lfs chroot) root:/sources/glibc-2.39/build#
```
Select timezone
```bash
(lfs chroot) root:/sources/glibc-2.39/build# tzselect
Please identify a location so that time zone rules can be set correctly.
Please select a continent, ocean, "coord", or "TZ".
 1) Africa
 2) Americas
 3) Antarctica
 4) Asia
 5) Atlantic Ocean
 6) Australia
 7) Europe
 8) Indian Ocean
 9) Pacific Ocean
10) coord - I want to use geographical coordinates.
11) TZ - I want to specify the timezone using the Posix TZ format.
#? 4
Please select a country whose clocks agree with yours.
 1) Afghanistan              15) French S. Terr.          29) Kyrgyzstan               43) Russia
 2) Antarctica               16) Georgia                  30) Laos                     44) Saudi Arabia
 3) Armenia                  17) Hong Kong                31) Lebanon                  45) Seychelles
 4) Azerbaijan               18) India                    32) Macau                    46) Singapore
 5) Bahrain                  19) Indonesia                33) Malaysia                 47) Sri Lanka
 6) Bangladesh               20) Iran                     34) Mongolia                 48) Syria
 7) Bhutan                   21) Iraq                     35) Myanmar (Burma)          49) Taiwan
 8) Brunei                   22) Israel                   36) Nepal                    50) Tajikistan
 9) Cambodia                 23) Japan                    37) Oman                     51) Thailand
10) China                    24) Jordan                   38) Pakistan                 52) Turkmenistan
11) Christmas Island         25) Kazakhstan               39) Palestine                53) United Arab Emirates
12) Cocos (Keeling) Islands  26) Korea (North)            40) Philippines              54) Uzbekistan
13) Cyprus                   27) Korea (South)            41) Qatar                    55) Vietnam
14) East Timor               28) Kuwait                   42) R?union                  56) Yemen
#? 10
Please select one of the following timezones.
1) Beijing Time
2) Xinjiang Time
#? 1

The following information has been given:

        China
        Beijing Time

Therefore TZ='Asia/Shanghai' will be used.
Selected time is now:   Tue May 21 17:28:04 CST 2024.
Universal Time is now:  Tue May 21 09:28:04 UTC 2024.
Is the above information OK?
1) Yes
2) No
#? 1

You can make this change permanent for yourself by appending the line
        TZ='Asia/Shanghai'; export TZ
to the file '.profile' in your home directory; then log out and log in again.

Here is that TZ value again, this time on standard output so that you
can use the /usr/bin/tzselect command in shell scripts:
Asia/Shanghai
(lfs chroot) root:/sources/glibc-2.39/build# echo "TZ='Asia/Shanghai'; export TZ" >> ~/.profile
(lfs chroot) root:/sources/glibc-2.39/build# cat ~/.profile
TZ='Asia/Shanghai'; export TZ
(lfs chroot) root:/sources/glibc-2.39/build#
(lfs chroot) root:/sources/glibc-2.39/build# ln -sfv /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
'/etc/localtime' -> '/usr/share/zoneinfo/Asia/Shanghai'
(lfs chroot) root:/sources/glibc-2.39/build#
```
##### 8.5.2.3 Configuring the Dynamic Loader
```bash
(lfs chroot) root:/sources/glibc-2.39/build# cat > /etc/ld.so.conf << "EOF"
> # Begin /etc/ld.so.conf
> /usr/local/lib
> /opt/lib
> EOF
(lfs chroot) root:/sources/glibc-2.39/build# cat >> /etc/ld.so.conf << "EOF"
> # Add an include directory
> include /etc/ld.so.conf.d/*.conf
> EOF
(lfs chroot) root:/sources/glibc-2.39/build# mkdir -pv /etc/ld.so.conf.d
mkdir: created directory '/etc/ld.so.conf.d'
(lfs chroot) root:/sources/glibc-2.39/build#
```
### 8.6 Zlib-1.3.1
```bash
(lfs chroot) root:/sources# tar xf zlib-1.3.1.tar.gz
(lfs chroot) root:/sources# cd zlib-1.3.1
(lfs chroot) root:/sources/zlib-1.3.1# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/zlib-1.3.1# make
...
(lfs chroot) root:/sources/zlib-1.3.1# make check
...
(lfs chroot) root:/sources/zlib-1.3.1# make install
...
(lfs chroot) root:/sources/zlib-1.3.1# rm -fv /usr/lib/libz.a
removed '/usr/lib/libz.a'
(lfs chroot) root:/sources/zlib-1.3.1#
```
### 8.7 Bzip2-1.0.8
```bash
(lfs chroot) root:/sources# tar xf bzip2-1.0.8.tar.gz
(lfs chroot) root:/sources# cd bzip2-1.0.8
(lfs chroot) root:/sources/bzip2-1.0.8# patch -Np1 -i ../bzip2-1.0.8-install_docs-1.patch
patching file Makefile
(lfs chroot) root:/sources/bzip2-1.0.8#
(lfs chroot) root:/sources/bzip2-1.0.8# sed -i 's@\(ln -s -f \)$(PREFIX)/bin/@\1@' Makefile
(lfs chroot) root:/sources/bzip2-1.0.8# sed -i "s@(PREFIX)/man@(PREFIX)/share/man@g" Makefile
(lfs chroot) root:/sources/bzip2-1.0.8# make -f Makefile-libbz2_so
...
(lfs chroot) root:/sources/bzip2-1.0.8# make clean
rm -f *.o libbz2.a bzip2 bzip2recover \
sample1.rb2 sample2.rb2 sample3.rb2 \
sample1.tst sample2.tst sample3.tst
(lfs chroot) root:/sources/bzip2-1.0.8# make
...
(lfs chroot) root:/sources/bzip2-1.0.8# make PREFIX=/usr install
...
(lfs chroot) root:/sources/bzip2-1.0.8# cp -av libbz2.so.* /usr/lib
'libbz2.so.1.0' -> '/usr/lib/libbz2.so.1.0'
'libbz2.so.1.0.8' -> '/usr/lib/libbz2.so.1.0.8'
(lfs chroot) root:/sources/bzip2-1.0.8# ln -sv libbz2.so.1.0.8 /usr/lib/libbz2.so
'/usr/lib/libbz2.so' -> 'libbz2.so.1.0.8'
(lfs chroot) root:/sources/bzip2-1.0.8#
(lfs chroot) root:/sources/bzip2-1.0.8# cp -v bzip2-shared /usr/bin/bzip2
'bzip2-shared' -> '/usr/bin/bzip2'
(lfs chroot) root:/sources/bzip2-1.0.8# for i in /usr/bin/{bzcat,bunzip2}; do
>   ln -sfv bzip2 $i
> done
'/usr/bin/bzcat' -> 'bzip2'
'/usr/bin/bunzip2' -> 'bzip2'
(lfs chroot) root:/sources/bzip2-1.0.8#
(lfs chroot) root:/sources/bzip2-1.0.8# rm -fv /usr/lib/libbz2.a
removed '/usr/lib/libbz2.a'
(lfs chroot) root:/sources/bzip2-1.0.8#
```
### 8.8 Xz-5.4.6
```bash
(lfs chroot) root:/sources# tar xf xz-5.4.6.tar.xz
(lfs chroot) root:/sources# cd xz-5.4.6
(lfs chroot) root:/sources/xz-5.4.6# ./configure --prefix=/usr    \
>             --disable-static \
>             --docdir=/usr/share/doc/xz-5.4.6
(lfs chroot) root:/sources/xz-5.4.6# make
...
(lfs chroot) root:/sources/xz-5.4.6# make check
...
(lfs chroot) root:/sources/xz-5.4.6# make install
...
```
### 8.9 Zstd-1.5.5
```bash
(lfs chroot) root:/sources# tar xf zstd-1.5.5.tar.gz
(lfs chroot) root:/sources# cd zstd-1.5.5
(lfs chroot) root:/sources/zstd-1.5.5# make prefix=/usr
...
(lfs chroot) root:/sources/zstd-1.5.5# make check
...
(lfs chroot) root:/sources/zstd-1.5.5# make prefix=/usr install
...
(lfs chroot) root:/sources/zstd-1.5.5# rm -v /usr/lib/libzstd.a
removed '/usr/lib/libzstd.a'
(lfs chroot) root:/sources/zstd-1.5.5#
```
### 8.10 File-5.45
```bash
(lfs chroot) root:/sources# tar xf file-5.45.tar.gz
(lfs chroot) root:/sources# cd file-5.45
(lfs chroot) root:/sources/file-5.45# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/file-5.45# make
...
(lfs chroot) root:/sources/file-5.45# make check
...
(lfs chroot) root:/sources/file-5.45# make install
...
```
### 8.11 Readline-8.2
```bash
(lfs chroot) root:/sources# tar xf readline-8.2.tar.gz
(lfs chroot) root:/sources# cd readline-8.2
(lfs chroot) root:/sources/readline-8.2# sed -i '/MV.*old/d' Makefile.in
(lfs chroot) root:/sources/readline-8.2# sed -i '/{OLDSUFF}/c:' support/shlib-install
(lfs chroot) root:/sources/readline-8.2# ./configure --prefix=/usr    \
>             --disable-static \
>             --with-curses    \
>             --docdir=/usr/share/doc/readline-8.2
...
(lfs chroot) root:/sources/readline-8.2# make SHLIB_LIBS="-lncursesw"
...
(lfs chroot) root:/sources/readline-8.2# make SHLIB_LIBS="-lncursesw" install
...
(lfs chroot) root:/sources/readline-8.2# install -v -m644 doc/*.{ps,pdf,html,dvi} /usr/share/doc/readline-8.2
'doc/history.ps' -> '/usr/share/doc/readline-8.2/history.ps'
'doc/history_3.ps' -> '/usr/share/doc/readline-8.2/history_3.ps'
'doc/readline.ps' -> '/usr/share/doc/readline-8.2/readline.ps'
'doc/readline_3.ps' -> '/usr/share/doc/readline-8.2/readline_3.ps'
'doc/rluserman.ps' -> '/usr/share/doc/readline-8.2/rluserman.ps'
'doc/history.pdf' -> '/usr/share/doc/readline-8.2/history.pdf'
'doc/readline.pdf' -> '/usr/share/doc/readline-8.2/readline.pdf'
'doc/rluserman.pdf' -> '/usr/share/doc/readline-8.2/rluserman.pdf'
'doc/history.html' -> '/usr/share/doc/readline-8.2/history.html'
'doc/readline.html' -> '/usr/share/doc/readline-8.2/readline.html'
'doc/rluserman.html' -> '/usr/share/doc/readline-8.2/rluserman.html'
'doc/history.dvi' -> '/usr/share/doc/readline-8.2/history.dvi'
'doc/readline.dvi' -> '/usr/share/doc/readline-8.2/readline.dvi'
'doc/rluserman.dvi' -> '/usr/share/doc/readline-8.2/rluserman.dvi'
(lfs chroot) root:/sources/readline-8.2#
```
### 8.12 M4-1.4.19
```bash
(lfs chroot) root:/sources/m4-1.4.19# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/m4-1.4.19# make
...
(lfs chroot) root:/sources/m4-1.4.19# make check
...
(lfs chroot) root:/sources/m4-1.4.19# make install
...
```
### 8.13 Bc-6.7.5
```bash
(lfs chroot) root:/sources# tar xf bc-6.7.5.tar.xz
(lfs chroot) root:/sources# cd bc-6.7.5
(lfs chroot) root:/sources/bc-6.7.5# CC=gcc ./configure --prefix=/usr -G -O3 -r
...
(lfs chroot) root:/sources/bc-6.7.5# make
...
(lfs chroot) root:/sources/bc-6.7.5# make test
...
(lfs chroot) root:/sources/bc-6.7.5# make install
...
```
### 8.14 Flex-2.6.4
```bash
(lfs chroot) root:/sources# tar xf flex-2.6.4.tar.gz
(lfs chroot) root:/sources# cd flex-2.6.4
(lfs chroot) root:/sources/flex-2.6.4# ./configure --prefix=/usr \
>             --docdir=/usr/share/doc/flex-2.6.4 \
>             --disable-static
...
(lfs chroot) root:/sources/flex-2.6.4# make
...
(lfs chroot) root:/sources/flex-2.6.4# make check
...
(lfs chroot) root:/sources/flex-2.6.4# make install
...
(lfs chroot) root:/sources/flex-2.6.4# ln -sv flex   /usr/bin/lex
'/usr/bin/lex' -> 'flex'
(lfs chroot) root:/sources/flex-2.6.4# ln -sv flex.1 /usr/share/man/man1/lex.1
'/usr/share/man/man1/lex.1' -> 'flex.1'
(lfs chroot) root:/sources/flex-2.6.4#
```
### 8.15 Tcl-8.6.13
```bash
(lfs chroot) root:/sources# tar xf tcl8.6.13-src.tar.gz
(lfs chroot) root:/sources# cd tcl8.6.13
(lfs chroot) root:/sources/tcl8.6.13# SRCDIR=$(pwd)
(lfs chroot) root:/sources/tcl8.6.13# cd unix
(lfs chroot) root:/sources/tcl8.6.13/unix# ./configure --prefix=/usr           \
>             --mandir=/usr/share/man
...
(lfs chroot) root:/sources/tcl8.6.13/unix# make
...
(lfs chroot) root:/sources/tcl8.6.13/unix# sed -e "s|$SRCDIR/unix|/usr/lib|" \
>     -e "s|$SRCDIR|/usr/include|"  \
>     -i tclConfig.sh
(lfs chroot) root:/sources/tcl8.6.13/unix# sed -e "s|$SRCDIR/unix/pkgs/tdbc1.1.5|/usr/lib/tdbc1.1.5|" \
>     -e "s|$SRCDIR/pkgs/tdbc1.1.5/generic|/usr/include|"    \
>     -e "s|$SRCDIR/pkgs/tdbc1.1.5/library|/usr/lib/tcl8.6|" \
>     -e "s|$SRCDIR/pkgs/tdbc1.1.5|/usr/include|"            \
>     -i pkgs/tdbc1.1.5/tdbcConfig.sh
(lfs chroot) root:/sources/tcl8.6.13/unix# sed -e "s|$SRCDIR/unix/pkgs/itcl4.2.3|/usr/lib/itcl4.2.3|" \
>     -e "s|$SRCDIR/pkgs/itcl4.2.3/generic|/usr/include|"    \
>     -e "s|$SRCDIR/pkgs/itcl4.2.3|/usr/include|"            \
>     -i pkgs/itcl4.2.3/itclConfig.sh
(lfs chroot) root:/sources/tcl8.6.13/unix# unset SRCDIR
(lfs chroot) root:/sources/tcl8.6.13/unix# make test
...
(lfs chroot) root:/sources/tcl8.6.13/unix# make install
...
(lfs chroot) root:/sources/tcl8.6.13/unix# chmod -v u+w /usr/lib/libtcl8.6.so
mode of '/usr/lib/libtcl8.6.so' changed from 0555 (r-xr-xr-x) to 0755 (rwxr-xr-x)
(lfs chroot) root:/sources/tcl8.6.13/unix# make install-private-headers
Installing private header files to /usr/include/
(lfs chroot) root:/sources/tcl8.6.13/unix#
(lfs chroot) root:/sources/tcl8.6.13/unix# ln -sfv tclsh8.6 /usr/bin/tclsh
'/usr/bin/tclsh' -> 'tclsh8.6'
(lfs chroot) root:/sources/tcl8.6.13/unix# mv /usr/share/man/man3/{Thread,Tcl_Thread}.3
(lfs chroot) root:/sources/tcl8.6.13/unix# cd ..
(lfs chroot) root:/sources/tcl8.6.13# tar -xf ../tcl8.6.13-html.tar.gz --strip-components=1
(lfs chroot) root:/sources/tcl8.6.13# mkdir -v -p /usr/share/doc/tcl-8.6.13
mkdir: created directory '/usr/share/doc/tcl-8.6.13'
(lfs chroot) root:/sources/tcl8.6.13# cp -v -r  ./html/* /usr/share/doc/tcl-8.6.13
'./html/ItclCmd' -> '/usr/share/doc/tcl-8.6.13/ItclCmd'
'./html/ItclCmd/scope.htm' -> '/usr/share/doc/tcl-8.6.13/ItclCmd/scope.htm'
...
```
### 8.16 Expect-5.45.4
```bash
(lfs chroot) root:/sources/tcl8.6.13# python3 -c 'from pty import spawn; spawn(["echo", "ok"])'
ok
(lfs chroot) root:/sources/tcl8.6.13#(lfs chroot) root:/sources/tcl8.6.13# cd ..
(lfs chroot) root:/sources# tar xf expect5.45.4.tar.gz
(lfs chroot) root:/sources# cd expect5.45.4
(lfs chroot) root:/sources/expect5.45.4# ./configure --prefix=/usr           \
>             --with-tcl=/usr/lib     \
>             --enable-shared         \
>             --mandir=/usr/share/man \
>             --with-tclinclude=/usr/include
...
(lfs chroot) root:/sources/expect5.45.4# make
...
(lfs chroot) root:/sources/expect5.45.4# make test
...
(lfs chroot) root:/sources/expect5.45.4# make install
...
(lfs chroot) root:/sources/expect5.45.4# ln -svf expect5.45.4/libexpect5.45.4.so /usr/lib
'/usr/lib/libexpect5.45.4.so' -> 'expect5.45.4/libexpect5.45.4.so'
(lfs chroot) root:/sources/expect5.45.4#
```
### 8.17 DejaGNU-1.6.3
```bash
(lfs chroot) root:/sources# tar xf dejagnu-1.6.3.tar.gz
(lfs chroot) root:/sources# cd dejagnu-1.6.3
(lfs chroot) root:/sources/dejagnu-1.6.3# mkdir -v build
mkdir: created directory 'build'
(lfs chroot) root:/sources/dejagnu-1.6.3# cd       build
(lfs chroot) root:/sources/dejagnu-1.6.3/build# ../configure --prefix=/usr
...
(lfs chroot) root:/sources/dejagnu-1.6.3/build# makeinfo --html --no-split -o doc/dejagnu.html ../doc/dejagnu.texi
(lfs chroot) root:/sources/dejagnu-1.6.3/build# makeinfo --plaintext       -o doc/dejagnu.txt  ../doc/dejagnu.texi
(lfs chroot) root:/sources/dejagnu-1.6.3/build# make check
...
(lfs chroot) root:/sources/dejagnu-1.6.3/build# make install
...
(lfs chroot) root:/sources/dejagnu-1.6.3/build# install -v -dm755  /usr/share/doc/dejagnu-1.6.3
install: creating directory '/usr/share/doc/dejagnu-1.6.3'
(lfs chroot) root:/sources/dejagnu-1.6.3/build# install -v -m644   doc/dejagnu.{html,txt} /usr/share/doc/dejagnu-1.6.3
'doc/dejagnu.html' -> '/usr/share/doc/dejagnu-1.6.3/dejagnu.html'
'doc/dejagnu.txt' -> '/usr/share/doc/dejagnu-1.6.3/dejagnu.txt'
(lfs chroot) root:/sources/dejagnu-1.6.3/build#
```
### 8.18 Pkgconf-2.1.1
```bash
(lfs chroot) root:/sources# tar xf pkgconf-2.1.1.tar.xz
(lfs chroot) root:/sources# cd pkgconf-2.1.1
(lfs chroot) root:/sources/pkgconf-2.1.1# ./configure --prefix=/usr              \
>             --disable-static           \
>             --docdir=/usr/share/doc/pkgconf-2.1.1
...
(lfs chroot) root:/sources/pkgconf-2.1.1# make
...
(lfs chroot) root:/sources/pkgconf-2.1.1# make install
...
(lfs chroot) root:/sources/pkgconf-2.1.1# ln -sv pkgconf   /usr/bin/pkg-config
'/usr/bin/pkg-config' -> 'pkgconf'
(lfs chroot) root:/sources/pkgconf-2.1.1# ln -sv pkgconf.1 /usr/share/man/man1/pkg-config.1
'/usr/share/man/man1/pkg-config.1' -> 'pkgconf.1'
(lfs chroot) root:/sources/pkgconf-2.1.1#
```
### 8.19 Binutils-2.42
```bash
(lfs chroot) root:/sources/binutils-2.42# rm -rf build/
(lfs chroot) root:/sources/binutils-2.42# mkdir -v build
mkdir: created directory 'build'
(lfs chroot) root:/sources/binutils-2.42# cd       build
(lfs chroot) root:/sources/binutils-2.42/build# ../configure --prefix=/usr       \
>              --sysconfdir=/etc   \
>              --enable-gold       \
>              --enable-ld=default \
>              --enable-plugins    \
>              --enable-shared     \
>              --disable-werror    \
>              --enable-64-bit-bfd \
>              --with-system-zlib  \
>              --enable-default-hash-style=gnu
...
(lfs chroot) root:/sources/binutils-2.42/build# make tooldir=/usr
...
(lfs chroot) root:/sources/binutils-2.42/build# make -k check
...
Running /sources/binutils-2.42/ld/testsuite/ld-xtensa/xtensa.exp ...
Running /sources/binutils-2.42/ld/testsuite/ld-z80/z80.exp ...
Running /sources/binutils-2.42/ld/testsuite/ld-z8k/z8k.exp ...

                === ld Summary ===

# of expected passes            2949
# of expected failures          60
# of untested testcases         1
# of unsupported tests          28
./ld-new 2.42

make[5]: Leaving directory '/sources/binutils-2.42/build/ld'
make[4]: Leaving directory '/sources/binutils-2.42/build/ld'
make[3]: Leaving directory '/sources/binutils-2.42/build/ld'
make[2]: Leaving directory '/sources/binutils-2.42/build/ld'
make[1]: Target 'check-host' not remade because of errors.
make[1]: Leaving directory '/sources/binutils-2.42/build'
make: *** [Makefile:2568: do-check] Error 2
make: Target 'check' not remade because of errors.
(lfs chroot) root:/sources/binutils-2.42/build#
(lfs chroot) root:/sources/binutils-2.42/build# grep '^FAIL:' $(find -name '*.log')
./gold/testsuite/test-suite.log:FAIL: weak_undef_test
./gold/testsuite/test-suite.log:FAIL: initpri3a
./gold/testsuite/test-suite.log:FAIL: script_test_1
./gold/testsuite/test-suite.log:FAIL: script_test_2
./gold/testsuite/test-suite.log:FAIL: justsyms
./gold/testsuite/test-suite.log:FAIL: justsyms_exec
./gold/testsuite/test-suite.log:FAIL: binary_test
./gold/testsuite/test-suite.log:FAIL: script_test_3
./gold/testsuite/test-suite.log:FAIL: tls_phdrs_script_test
./gold/testsuite/test-suite.log:FAIL: script_test_12i
./gold/testsuite/test-suite.log:FAIL: incremental_test_2
./gold/testsuite/test-suite.log:FAIL: incremental_test_5
(lfs chroot) root:/sources/binutils-2.42/build# grep '^FAIL:' $(find -name '*.log') | wc -l
12
(lfs chroot) root:/sources/binutils-2.42/build# make tooldir=/usr install
...
(lfs chroot) root:/sources/binutils-2.42/build# rm -fv /usr/lib/lib{bfd,ctf,ctf-nobfd,gprofng,opcodes,sframe}.a
removed '/usr/lib/libbfd.a'
removed '/usr/lib/libctf.a'
removed '/usr/lib/libctf-nobfd.a'
removed '/usr/lib/libgprofng.a'
removed '/usr/lib/libopcodes.a'
removed '/usr/lib/libsframe.a'
(lfs chroot) root:/sources/binutils-2.42/build#
```
### 8.20 GMP-6.3.0
```bash
(lfs chroot) root:/sources# tar xf gmp-6.3.0.tar.xz
(lfs chroot) root:/sources# cd gmp
bash: cd: gmp: No such file or directory
(lfs chroot) root:/sources# cd gmp-6.3.0
(lfs chroot) root:/sources/gmp-6.3.0# ./configure --prefix=/usr    \
>             --enable-cxx     \
>             --disable-static \
>             --docdir=/usr/share/doc/gmp-6.3.0 \
>             --host=none-linux-gnu
...
(lfs chroot) root:/sources/gmp-6.3.0# make
...
(lfs chroot) root:/sources/gmp-6.3.0# make html
...
(lfs chroot) root:/sources/gmp-6.3.0# make check 2>&1 | tee gmp-check-log
...
(lfs chroot) root:/sources/gmp-6.3.0# awk '/# PASS:/{total+=$3} ; END{print total}' gmp-check-log
199
(lfs chroot) root:/sources/gmp-6.3.0#
(lfs chroot) root:/sources/gmp-6.3.0# make install
...
(lfs chroot) root:/sources/gmp-6.3.0# make install-html
...
```
### 8.21 MPFR-4.2.1
```bash
(lfs chroot) root:/sources# tar xf mpfr-4.2.1.tar.xz
(lfs chroot) root:/sources# cd mpfr-4.2.1
(lfs chroot) root:/sources/mpfr-4.2.1# ./configure --prefix=/usr        \
>             --disable-static     \
>             --enable-thread-safe \
>             --docdir=/usr/share/doc/mpfr-4.2.1
...
(lfs chroot) root:/sources/mpfr-4.2.1# make
...
(lfs chroot) root:/sources/mpfr-4.2.1# make html
...
(lfs chroot) root:/sources/mpfr-4.2.1# make install
...
(lfs chroot) root:/sources/mpfr-4.2.1# make install-html
...
```
### 8.22 MPC-1.3.1
```bash
(lfs chroot) root:/sources# tar xf mpc-1.3.1.tar.gz
(lfs chroot) root:/sources# cd mpc-1.3.1
(lfs chroot) root:/sources/mpc-1.3.1# ./configure --prefix=/usr    \
>             --disable-static \
>             --docdir=/usr/share/doc/mpc-1.3.1
...
(lfs chroot) root:/sources/mpc-1.3.1# make
...
(lfs chroot) root:/sources/mpc-1.3.1# make html
...
(lfs chroot) root:/sources/mpc-1.3.1# make check
...
(lfs chroot) root:/sources/mpc-1.3.1# make install
...
(lfs chroot) root:/sources/mpc-1.3.1# make install-html
...
```
### 8.23 Attr-2.5.2
```bash
(lfs chroot) root:/sources# tar xf attr-2.5.2.tar.gz
(lfs chroot) root:/sources# cd attr-2.5.2
(lfs chroot) root:/sources/attr-2.5.2# ./configure --prefix=/usr     \
>             --disable-static  \
>             --sysconfdir=/etc \
>             --docdir=/usr/share/doc/attr-2.5.2
...
(lfs chroot) root:/sources/attr-2.5.2# make
...
(lfs chroot) root:/sources/attr-2.5.2# make check
...
(lfs chroot) root:/sources/attr-2.5.2# make install
...
```
### 8.24 Acl-2.3.2
```bash
(lfs chroot) root:/sources# tar xf acl-2.3.2.tar.xz
(lfs chroot) root:/sources# cd acl-2.3.2
(lfs chroot) root:/sources/acl-2.3.2# ./configure --prefix=/usr         \
>             --disable-static      \
>             --docdir=/usr/share/doc/acl-2.3.2
...
(lfs chroot) root:/sources/acl-2.3.2# make
...
(lfs chroot) root:/sources/acl-2.3.2# make install
...
```
### 8.25 Libcap-2.69
```bash
(lfs chroot) root:/sources# tar xf libcap-2.69.tar.xz
(lfs chroot) root:/sources# cd libcap-2.69
(lfs chroot) root:/sources/libcap-2.69# sed -i '/install -m.*STA/d' libcap/Makefile
(lfs chroot) root:/sources/libcap-2.69# make prefix=/usr lib=lib
...
(lfs chroot) root:/sources/libcap-2.69# make test
...
(lfs chroot) root:/sources/libcap-2.69# make prefix=/usr lib=lib install
...
```
### 8.26 Libxcrypt-4.4.36
```bash
(lfs chroot) root:/sources/libcap-2.69# cd ..
(lfs chroot) root:/sources# tar xf libxcrypt-4.4.36.tar.xz
(lfs chroot) root:/sources# cd libxcrypt-4.4.36
(lfs chroot) root:/sources/libxcrypt-4.4.36# ./configure --prefix=/usr                \
>             --enable-hashes=strong,glibc \
>             --enable-obsolete-api=no     \
>             --disable-static             \
>             --disable-failure-tokens
...
(lfs chroot) root:/sources/libxcrypt-4.4.36# make
...
(lfs chroot) root:/sources/libxcrypt-4.4.36# make check
...
(lfs chroot) root:/sources/libxcrypt-4.4.36# make install
...
```
### 8.27 Shadow-4.14.5
```bash
(lfs chroot) root:/sources# tar xf shadow-4.14.5.tar.xz
(lfs chroot) root:/sources# cd shadow-4.14.5
(lfs chroot) root:/sources/shadow-4.14.5# sed -i 's/groups$(EXEEXT) //' src/Makefile.in
(lfs chroot) root:/sources/shadow-4.14.5# find man -name Makefile.in -exec sed -i 's/groups\.1 / /'   {} \;
(lfs chroot) root:/sources/shadow-4.14.5# find man -name Makefile.in -exec sed -i 's/getspnam\.3 / /' {} \;
(lfs chroot) root:/sources/shadow-4.14.5# find man -name Makefile.in -exec sed -i 's/passwd\.5 / /'   {} \;
(lfs chroot) root:/sources/shadow-4.14.5#
(lfs chroot) root:/sources/shadow-4.14.5# sed -e 's:#ENCRYPT_METHOD DES:ENCRYPT_METHOD YESCRYPT:' \
>     -e 's:/var/spool/mail:/var/mail:'                   \
>     -e '/PATH=/{s@/sbin:@@;s@/bin:@@}'                  \
>     -i etc/login.defs
(lfs chroot) root:/sources/shadow-4.14.5# touch /usr/bin/passwd
(lfs chroot) root:/sources/shadow-4.14.5# ./configure --sysconfdir=/etc   \
>             --disable-static    \
>             --with-{b,yes}crypt \
>             --without-libbsd    \
>             --with-group-name-max-length=32
...
(lfs chroot) root:/sources/shadow-4.14.5# make
...
(lfs chroot) root:/sources/shadow-4.14.5# make exec_prefix=/usr install
...
(lfs chroot) root:/sources/shadow-4.14.5# make -C man install-man
...
```
### 8.27.2 Configuring Shadow
```bash
(lfs chroot) root:/sources/shadow-4.14.5# pwconv
(lfs chroot) root:/sources/shadow-4.14.5# grpconv
(lfs chroot) root:/sources/shadow-4.14.5# mkdir -p /etc/default
(lfs chroot) root:/sources/shadow-4.14.5# useradd -D --gid 999
(lfs chroot) root:/sources/shadow-4.14.5# sed -i '/MAIL/s/yes/no/' /etc/default/useradd
(lfs chroot) root:/sources/shadow-4.14.5# passwd root
Changing password for root
Enter the new password (minimum of 5 characters)
Please use a combination of upper and lower case letters and numbers.
New password:
Bad password: too short.
Warning: weak password (enter it again to use it anyway).
New password:
Re-enter new password:
passwd: password changed.
(lfs chroot) root:/sources/shadow-4.14.5#
```
### 8.28 GCC-13.2.0
```bash
(lfs chroot) root:/sources/gcc-13.2.0# rm -rf build
(lfs chroot) root:/sources/gcc-13.2.0# case $(uname -m) in
>   x86_64)
>     sed -e '/m64=/s/lib64/lib/' \
>         -i.orig gcc/config/i386/t-linux64
>   ;;
> esac
(lfs chroot) root:/sources/gcc-13.2.0# mkdir -v build
mkdir: created directory 'build'
(lfs chroot) root:/sources/gcc-13.2.0# cd       build
(lfs chroot) root:/sources/gcc-13.2.0/build# ../configure --prefix=/usr            \
>              LD=ld                    \
>              --enable-languages=c,c++ \
>              --enable-default-pie     \
>              --enable-default-ssp     \
>              --disable-multilib       \
>              --disable-bootstrap      \
>              --disable-fixincludes    \
>              --with-system-zlib
...
(lfs chroot) root:/sources/gcc-13.2.0/build# make
...
(lfs chroot) root:/sources/gcc-13.2.0/build# ulimit -s 32768
(lfs chroot) root:/sources/gcc-13.2.0/build# chown -R tester .
(lfs chroot) root:/sources/gcc-13.2.0/build# su tester -c "PATH=$PATH make -j8 -k check"
...

                === libstdc++ Summary ===

# of expected passes            4275
# of expected failures          11
# of unsupported tests          102
Running /sources/gcc-13.2.0/libstdc++-v3/testsuite/libstdc++-xmethods/xmethods.exp ...
Running /sources/gcc-13.2.0/libstdc++-v3/testsuite/libstdc++-xmethods/xmethods.exp ...
Running /sources/gcc-13.2.0/libstdc++-v3/testsuite/libstdc++-xmethods/xmethods.exp ...

                === libstdc++ Summary ===

# of expected passes            1533
# of expected failures          8
# of unsupported tests          37

                === libstdc++ Summary ===

# of expected passes            1419
# of unexpected failures        1
# of expected failures          19
# of unsupported tests          58

                === libstdc++ Summary ===

# of expected passes            1536
# of expected failures          14
# of unsupported tests          36
Running /sources/gcc-13.2.0/libstdc++-v3/testsuite/libstdc++-xmethods/xmethods.exp ...
Running /sources/gcc-13.2.0/libstdc++-v3/testsuite/libstdc++-xmethods/xmethods.exp ...

                === libstdc++ Summary ===

# of expected passes            1480
# of expected failures          12
# of unsupported tests          19

                === libstdc++ Summary ===

# of expected passes            1470
# of expected failures          18
# of unsupported tests          25
Running /sources/gcc-13.2.0/libstdc++-v3/testsuite/libstdc++-prettyprinters/prettyprinters.exp ...
Running /sources/gcc-13.2.0/libstdc++-v3/testsuite/libstdc++-prettyprinters/prettyprinters.exp ...
Running /sources/gcc-13.2.0/libstdc++-v3/testsuite/libstdc++-xmethods/xmethods.exp ...

                === libstdc++ Summary ===

# of expected passes            1397
# of expected failures          10
# of unsupported tests          26
Running /sources/gcc-13.2.0/libstdc++-v3/testsuite/libstdc++-xmethods/xmethods.exp ...

                === libstdc++ Summary ===

# of expected passes            2567
# of expected failures          14
# of unsupported tests          78
make[5]: Leaving directory '/sources/gcc-13.2.0/build/x86_64-pc-linux-gnu/libstdc++-v3/testsuite'
make[4]: Leaving directory '/sources/gcc-13.2.0/build/x86_64-pc-linux-gnu/libstdc++-v3/testsuite'
make[3]: Leaving directory '/sources/gcc-13.2.0/build/x86_64-pc-linux-gnu/libstdc++-v3/testsuite'
Making check in python
make[3]: Entering directory '/sources/gcc-13.2.0/build/x86_64-pc-linux-gnu/libstdc++-v3/python'
make[3]: Nothing to be done for 'check'.
make[3]: Leaving directory '/sources/gcc-13.2.0/build/x86_64-pc-linux-gnu/libstdc++-v3/python'
make[3]: Entering directory '/sources/gcc-13.2.0/build/x86_64-pc-linux-gnu/libstdc++-v3'
true "AR_FLAGS=rc" "CC_FOR_BUILD=gcc" "CC_FOR_TARGET=/sources/gcc-13.2.0/build/./gcc/xgcc -B/sources/gcc-13.2.0/build/./gcc/" "CFLAGS=-g -O2" "CXXFLAGS=-g -O2 -D_GNU_SOURCE" "CFLAGS_FOR_BUILD=-g -O2" "CFLAGS_FOR_TARGET=-g -O2" "INSTALL=/usr/bin/install -c" "INSTALL_DATA=/usr/bin/install -c -m 644" "INSTALL_PROGRAM=/usr/bin/install -c" "INSTALL_SCRIPT=/usr/bin/install -c" "LDFLAGS=" "LIBCFLAGS=-g -O2" "LIBCFLAGS_FOR_TARGET=-g -O2" "MAKE=make" "MAKEINFO=makeinfo --split-size=5000000 --split-size=5000000  " "SHELL=/bin/sh" "RUNTESTFLAGS=" "exec_prefix=/usr" "infodir=/usr/share/info" "libdir=/usr/lib" "includedir=/usr/include" "prefix=/usr" "tooldir=/usr/x86_64-pc-linux-gnu" "gxx_include_dir=/usr/include/c++/13.2.0" "AR=ar" "AS=/sources/gcc-13.2.0/build/./gcc/as" "LD=/sources/gcc-13.2.0/build/./gcc/collect-ld" "RANLIB=ranlib" "NM=/sources/gcc-13.2.0/build/./gcc/nm" "NM_FOR_BUILD=" "NM_FOR_TARGET=nm" "DESTDIR=" "WERROR=" DO=all multi-do # make
make[3]: Leaving directory '/sources/gcc-13.2.0/build/x86_64-pc-linux-gnu/libstdc++-v3'
make[2]: Leaving directory '/sources/gcc-13.2.0/build/x86_64-pc-linux-gnu/libstdc++-v3'
make[1]: Leaving directory '/sources/gcc-13.2.0/build'
(lfs chroot) root:/sources/gcc-13.2.0/build# echo $?
0
(lfs chroot) root:/sources/gcc-13.2.0/build#
(lfs chroot) root:/sources/gcc-13.2.0/build# ../contrib/test_summary
cat <<'EOF' |
LAST_UPDATED: Obtained from git: releases/gcc-13.2.0 revision c891d8dc23e1a46ad9f3e757d09e57b500d40044

Native configuration is x86_64-pc-linux-gnu

                === g++ tests ===


Running target unix
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtollOOBTest Strtol(array + 3, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtollOOBTest Strtol(array - 1, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtollOOBTest Strtol(array, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtollOOBTest Strtol(array, NULL, 36) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtollOOBTest Strtol(array, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtollOOBTest Strtol(array, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtollOOBTest Strtol(array, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtolOOBTest Strtol(array + 3, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtolOOBTest Strtol(array - 1, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtolOOBTest Strtol(array, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtolOOBTest Strtol(array, NULL, 36) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtolOOBTest Strtol(array, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtolOOBTest Strtol(array, NULL, 0) execution test
FAIL: g++.dg/asan/asan_test.C   -O2  AddressSanitizer_StrtolOOBTest Strtol(array, NULL, 0) execution test
FAIL: g++.dg/asan/interception-malloc-test-1.C   -O0  execution test
FAIL: g++.dg/asan/interception-malloc-test-1.C   -O1  execution test
FAIL: g++.dg/asan/interception-malloc-test-1.C   -O2  execution test
FAIL: g++.dg/asan/interception-malloc-test-1.C   -O3 -g  execution test
FAIL: g++.dg/asan/interception-malloc-test-1.C   -Os  execution test
FAIL: g++.dg/asan/interception-malloc-test-1.C   -O2 -flto -fno-use-linker-plugin -flto-partition=none  execution test
FAIL: g++.dg/asan/interception-malloc-test-1.C   -O2 -flto -fuse-linker-plugin -fno-fat-lto-objects  execution test

                === g++ Summary ===

# of expected passes            237387
# of unexpected failures        21
# of expected failures          2071
# of unsupported tests          10456
/sources/gcc-13.2.0/build/gcc/xg++  version 13.2.0 (GCC)

                === gcc tests ===


Running target unix
FAIL: gcc.dg/analyzer/data-model-4.c (test for excess errors)
FAIL: gcc.dg/analyzer/torture/conftest-1.c   -O0  (test for excess errors)
FAIL: gcc.dg/analyzer/torture/conftest-1.c   -O1  (test for excess errors)
FAIL: gcc.dg/analyzer/torture/conftest-1.c   -O2  (test for excess errors)
FAIL: gcc.dg/analyzer/torture/conftest-1.c   -O3 -g  (test for excess errors)
FAIL: gcc.dg/analyzer/torture/conftest-1.c   -Os  (test for excess errors)
FAIL: gcc.dg/analyzer/torture/conftest-1.c   -O2 -flto -fno-use-linker-plugin -flto-partition=none  (test for excess errors)
FAIL: gcc.dg/pr56837.c scan-tree-dump-times optimized "memset ..c, 68, 16384.;" 1

                === gcc Summary ===

# of expected passes            184920
# of unexpected failures        8
# of expected failures          1436
# of unsupported tests          2461
/sources/gcc-13.2.0/build/gcc/xgcc  version 13.2.0 (GCC)

                === libatomic tests ===


Running target unix

                === libatomic Summary ===

# of expected passes            54
                === libgomp tests ===


Running target unix

                === libgomp Summary ===

# of expected passes            5118
# of expected failures          32
# of unsupported tests          355
                === libitm tests ===


Running target unix

                === libitm Summary ===

# of expected passes            44
# of expected failures          3
# of unsupported tests          1
                === libstdc++ tests ===


Running target unix
FAIL: 23_containers/vector/bool/allocator/copy.cc (test for excess errors)

                === libstdc++ Summary ===

# of expected passes            15677
# of unexpected failures        1
# of expected failures          106
# of unsupported tests          381

Compiler version: 13.2.0 (GCC)
Platform: x86_64-pc-linux-gnu
configure flags: --prefix=/usr LD=ld --enable-languages=c,c++ --enable-default-pie --enable-default-ssp --disable-multilib --disable-bootstrap --disable-fixincludes --with-system-zlib
EOF
Mail -s "Results for 13.2.0 (GCC) testsuite on x86_64-pc-linux-gnu" gcc-testresults@gcc.gnu.org &&
mv /sources/gcc-13.2.0/build/./gcc/testsuite/g++/g++.sum /sources/gcc-13.2.0/build/./gcc/testsuite/g++/g++.sum.sent &&
mv /sources/gcc-13.2.0/build/./gcc/testsuite/gcc/gcc.sum /sources/gcc-13.2.0/build/./gcc/testsuite/gcc/gcc.sum.sent &&
mv /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libatomic/testsuite/libatomic.sum /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libatomic/testsuite/libatomic.sum.sent &&
mv /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libgomp/testsuite/libgomp.sum /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libgomp/testsuite/libgomp.sum.sent &&
mv /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libitm/testsuite/libitm.sum /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libitm/testsuite/libitm.sum.sent &&
mv /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libstdc++-v3/testsuite/libstdc++.sum /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libstdc++-v3/testsuite/libstdc++.sum.sent &&
mv /sources/gcc-13.2.0/build/./gcc/testsuite/g++/g++.log /sources/gcc-13.2.0/build/./gcc/testsuite/g++/g++.log.sent &&
mv /sources/gcc-13.2.0/build/./gcc/testsuite/gcc/gcc.log /sources/gcc-13.2.0/build/./gcc/testsuite/gcc/gcc.log.sent &&
mv /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libatomic/testsuite/libatomic.log /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libatomic/testsuite/libatomic.log.sent &&
mv /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libgomp/testsuite/libgomp.log /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libgomp/testsuite/libgomp.log.sent &&
mv /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libitm/testsuite/libitm.log /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libitm/testsuite/libitm.log.sent &&
mv /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libstdc++-v3/testsuite/libstdc++.log /sources/gcc-13.2.0/build/./x86_64-pc-linux-gnu/libstdc++-v3/testsuite/libstdc++.log.sent &&
true
(lfs chroot) root:/sources/gcc-13.2.0/build#
(lfs chroot) root:/sources/gcc-13.2.0/build# make install
...
(lfs chroot) root:/sources/gcc-13.2.0/build# chown -v -R root:root \
>     /usr/lib/gcc/$(gcc -dumpmachine)/13.2.0/include{,-fixed}
...
(lfs chroot) root:/sources/gcc-13.2.0/build# ln -svr /usr/bin/cpp /usr/lib
'/usr/lib/cpp' -> '../bin/cpp'
(lfs chroot) root:/sources/gcc-13.2.0/build#
(lfs chroot) root:/sources/gcc-13.2.0/build# ln -sv gcc.1 /usr/share/man/man1/cc.1
'/usr/share/man/man1/cc.1' -> 'gcc.1'
(lfs chroot) root:/sources/gcc-13.2.0/build# ln -sfv ../../libexec/gcc/$(gcc -dumpmachine)/13.2.0/liblto_plugin.so \
>         /usr/lib/bfd-plugins
'/usr/lib/bfd-plugins/liblto_plugin.so' -> '../../libexec/gcc/x86_64-pc-linux-gnu/13.2.0/liblto_plugin.so'
(lfs chroot) root:/sources/gcc-13.2.0/build# echo 'int main(){}' > dummy.c
(lfs chroot) root:/sources/gcc-13.2.0/build# cc dummy.c -v -Wl,--verbose &> dummy.log
(lfs chroot) root:/sources/gcc-13.2.0/build# readelf -l a.out | grep ': /lib'
      [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]
(lfs chroot) root:/sources/gcc-13.2.0/build#
(lfs chroot) root:/sources/gcc-13.2.0/build# grep -E -o '/usr/lib.*/S?crt[1in].*succeeded' dummy.log
/usr/lib/gcc/x86_64-pc-linux-gnu/13.2.0/../../../../lib/Scrt1.o succeeded
/usr/lib/gcc/x86_64-pc-linux-gnu/13.2.0/../../../../lib/crti.o succeeded
/usr/lib/gcc/x86_64-pc-linux-gnu/13.2.0/../../../../lib/crtn.o succeeded
(lfs chroot) root:/sources/gcc-13.2.0/build# grep -B4 '^ /usr/include' dummy.log
#include <...> search starts here:
 /usr/lib/gcc/x86_64-pc-linux-gnu/13.2.0/include
 /usr/local/include
 /usr/lib/gcc/x86_64-pc-linux-gnu/13.2.0/include-fixed
 /usr/include
(lfs chroot) root:/sources/gcc-13.2.0/build#
(lfs chroot) root:/sources/gcc-13.2.0/build# grep 'SEARCH.*/usr/lib' dummy.log |sed 's|; |\n|g'
SEARCH_DIR("/usr/x86_64-pc-linux-gnu/lib64")
SEARCH_DIR("/usr/local/lib64")
SEARCH_DIR("/lib64")
SEARCH_DIR("/usr/lib64")
SEARCH_DIR("/usr/x86_64-pc-linux-gnu/lib")
SEARCH_DIR("/usr/local/lib")
SEARCH_DIR("/lib")
SEARCH_DIR("/usr/lib");
(lfs chroot) root:/sources/gcc-13.2.0/build#
(lfs chroot) root:/sources/gcc-13.2.0/build# grep "/lib.*/libc.so.6 " dummy.log
attempt to open /usr/lib/libc.so.6 succeeded
(lfs chroot) root:/sources/gcc-13.2.0/build#
(lfs chroot) root:/sources/gcc-13.2.0/build# grep found dummy.log
found ld-linux-x86-64.so.2 at /usr/lib/ld-linux-x86-64.so.2
(lfs chroot) root:/sources/gcc-13.2.0/build#
(lfs chroot) root:/sources/gcc-13.2.0/build# rm -v dummy.c a.out dummy.log
removed 'dummy.c'
removed 'a.out'
removed 'dummy.log'
(lfs chroot) root:/sources/gcc-13.2.0/build#
(lfs chroot) root:/sources/gcc-13.2.0/build# mkdir -pv /usr/share/gdb/auto-load/usr/lib
mkdir: created directory '/usr/share/gdb'
mkdir: created directory '/usr/share/gdb/auto-load'
mkdir: created directory '/usr/share/gdb/auto-load/usr'
mkdir: created directory '/usr/share/gdb/auto-load/usr/lib'
(lfs chroot) root:/sources/gcc-13.2.0/build# mv -v /usr/lib/*gdb.py /usr/share/gdb/auto-load/usr/lib
renamed '/usr/lib/libstdc++.so.6.0.32-gdb.py' -> '/usr/share/gdb/auto-load/usr/lib/libstdc++.so.6.0.32-gdb.py'
(lfs chroot) root:/sources/gcc-13.2.0/build#
```
### 8.29 Ncurses-6.4-20230520
```bash
(lfs chroot) root:/sources/ncurses-6.4-20230520# ./configure --prefix=/usr           \
>             --mandir=/usr/share/man \
>             --with-shared           \
>             --without-debug         \
>             --without-normal        \
>             --with-cxx-shared       \
>             --enable-pc-files       \
>             --enable-widec          \
>             --with-pkg-config-libdir=/usr/lib/pkgconfig
...
(lfs chroot) root:/sources/ncurses-6.4-20230520# make
...
(lfs chroot) root:/sources/ncurses-6.4-20230520# make DESTDIR=$PWD/dest install
...
(lfs chroot) root:/sources/ncurses-6.4-20230520# install -vm755 dest/usr/lib/libncursesw.so.6.4 /usr/lib
removed '/usr/lib/libncursesw.so.6.4'
'dest/usr/lib/libncursesw.so.6.4' -> '/usr/lib/libncursesw.so.6.4'
(lfs chroot) root:/sources/ncurses-6.4-20230520#
(lfs chroot) root:/sources/ncurses-6.4-20230520# rm -v  dest/usr/lib/libncursesw.so.6.4
removed 'dest/usr/lib/libncursesw.so.6.4'
(lfs chroot) root:/sources/ncurses-6.4-20230520#
(lfs chroot) root:/sources/ncurses-6.4-20230520# sed -e 's/^#if.*XOPEN.*$/#if 1/' \
>     -i dest/usr/include/curses.h
(lfs chroot) root:/sources/ncurses-6.4-20230520# cp -av dest/* /
...
(lfs chroot) root:/sources/ncurses-6.4-20230520# for lib in ncurses form panel menu ; do
>     ln -sfv lib${lib}w.so /usr/lib/lib${lib}.so
>     ln -sfv ${lib}w.pc    /usr/lib/pkgconfig/${lib}.pc
> done
'/usr/lib/libncurses.so' -> 'libncursesw.so'
'/usr/lib/pkgconfig/ncurses.pc' -> 'ncursesw.pc'
'/usr/lib/libform.so' -> 'libformw.so'
'/usr/lib/pkgconfig/form.pc' -> 'formw.pc'
'/usr/lib/libpanel.so' -> 'libpanelw.so'
'/usr/lib/pkgconfig/panel.pc' -> 'panelw.pc'
'/usr/lib/libmenu.so' -> 'libmenuw.so'
'/usr/lib/pkgconfig/menu.pc' -> 'menuw.pc'
(lfs chroot) root:/sources/ncurses-6.4-20230520#
(lfs chroot) root:/sources/ncurses-6.4-20230520# ln -sfv libncursesw.so /usr/lib/libcurses.so
'/usr/lib/libcurses.so' -> 'libncursesw.so'
(lfs chroot) root:/sources/ncurses-6.4-20230520#
(lfs chroot) root:/sources/ncurses-6.4-20230520# cp -v -R doc -T /usr/share/doc/ncurses-6.4-20230520
...
```
### 8.30 Sed-4.9
```bash
(lfs chroot) root:/sources/sed-4.9# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/sed-4.9# make
...
(lfs chroot) root:/sources/sed-4.9# make html
...
(lfs chroot) root:/sources/sed-4.9# chown -R tester .
(lfs chroot) root:/sources/sed-4.9# su tester -c "PATH=$PATH make check"
...
(lfs chroot) root:/sources/sed-4.9# make install
...
(lfs chroot) root:/sources/sed-4.9# install -d -m755           /usr/share/doc/sed-4.9
(lfs chroot) root:/sources/sed-4.9# install -m644 doc/sed.html /usr/share/doc/sed-4.9
```
### 8.31 Psmisc-23.6
```bash
(lfs chroot) root:/sources# tar xf psmisc-23.6.tar.xz
(lfs chroot) root:/sources# cd psmisc-23.6
(lfs chroot) root:/sources/psmisc-23.6# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/psmisc-23.6# make
...
(lfs chroot) root:/sources/psmisc-23.6# make check
...
(lfs chroot) root:/sources/psmisc-23.6# make install
...
```
### 8.32 Gettext-0.22.4
```bash
(lfs chroot) root:/sources# rm -rf gettext-0.22.4
(lfs chroot) root:/sources# tar xf gettext-0.22.4.tar.xz
cd (lfs chroot) root:/sources# cd gettext-0.22.4
(lfs chroot) root:/sources/gettext-0.22.4# ./configure --prefix=/usr    \
>             --disable-static \
>             --docdir=/usr/share/doc/gettext-0.22.4
...
(lfs chroot) root:/sources/gettext-0.22.4# make
...
(lfs chroot) root:/sources/gettext-0.22.4# make check
...
(lfs chroot) root:/sources/gettext-0.22.4# make install
...
(lfs chroot) root:/sources/gettext-0.22.4# chmod -v 0755 /usr/lib/preloadable_libintl.so
mode of '/usr/lib/preloadable_libintl.so' changed from 0644 (rw-r--r--) to 0755 (rwxr-xr-x)
(lfs chroot) root:/sources/gettext-0.22.4#
```
### 8.33 Bison-3.8.2
```bash
(lfs chroot) root:/sources# rm bison-3.8.2
rm: cannot remove 'bison-3.8.2': Is a directory
(lfs chroot) root:/sources# rm -rf bison-3.8.2
(lfs chroot) root:/sources# tar xf bison-3.8.2.tar.xz
(lfs chroot) root:/sources# cd bison-3.8.2
(lfs chroot) root:/sources/bison-3.8.2# ./configure --prefix=/usr --docdir=/usr/share/doc/bison-3.8.2
...
(lfs chroot) root:/sources/bison-3.8.2# make
...
(lfs chroot) root:/sources/bison-3.8.2# make check
...
(lfs chroot) root:/sources/bison-3.8.2# make install
...
```
### 8.35. Bash-5.2.21
```bash
(lfs chroot) root:/sources# rm -rf bash-5.2.21
(lfs chroot) root:/sources# tar xf bash-5.2.21.tar.gz
(lfs chroot) root:/sources# cd bash-5.2.21
(lfs chroot) root:/sources/bash-5.2.21# patch -Np1 -i ../bash-5.2.21-upstream_fixes-1.patch
patching file builtins/declare.def
patching file patchlevel.h
patching file arrayfunc.c
patching file subst.c
patching file patchlevel.h
patching file execute_cmd.c
patching file patchlevel.h
(lfs chroot) root:/sources/bash-5.2.21# ./configure --prefix=/usr             \
>             --without-bash-malloc     \
>             --with-installed-readline \
>             --docdir=/usr/share/doc/bash-5.2.21
...
(lfs chroot) root:/sources/bash-5.2.21# make
...
(lfs chroot) root:/sources/bash-5.2.21# chown -R tester .
(lfs chroot) root:/sources/bash-5.2.21# su -s /usr/bin/expect tester << "EOF"
> set timeout -1
> spawn make tests
> expect eof
> lassign [wait] _ _ _ value
> exit $value
> EOF
...
(lfs chroot) root:/sources/bash-5.2.21# make install
...
(lfs chroot) root:/sources/bash-5.2.21# exec /usr/bin/bash --login
(lfs chroot) root:/sources/bash-5.2.21#
```
### 8.36 Libtool-2.4.7
```bash
(lfs chroot) root:/sources# tar xf libtool-2.4.7.tar.xz
(lfs chroot) root:/sources# cd libtool-2.4.7
(lfs chroot) root:/sources/libtool-2.4.7# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/libtool-2.4.7# make
...
(lfs chroot) root:/sources/libtool-2.4.7# make -k check
...
(lfs chroot) root:/sources/libtool-2.4.7# make install
...
(lfs chroot) root:/sources/libtool-2.4.7# rm -fv /usr/lib/libltdl.a
removed '/usr/lib/libltdl.a'
(lfs chroot) root:/sources/libtool-2.4.7#
```
### 8.37 GDBM-1.23
```bash
(lfs chroot) root:/sources# tar xf gdbm-1.23.tar.gz
(lfs chroot) root:/sources# cd gdbm-1.23
(lfs chroot) root:/sources/gdbm-1.23# ./configure --prefix=/usr    \
>             --disable-static \
>             --enable-libgdbm-compat
...
(lfs chroot) root:/sources/gdbm-1.23# make
...
(lfs chroot) root:/sources/gdbm-1.23# make check
...
(lfs chroot) root:/sources/gdbm-1.23# make install
...
```
### 8.38 Gperf-3.1
```bash
(lfs chroot) root:/sources# tar xf gperf-3.1.tar.gz
(lfs chroot) root:/sources# cd gperf-3.1
(lfs chroot) root:/sources/gperf-3.1# ./configure --prefix=/usr --docdir=/usr/share/doc/gperf-3.1
...
(lfs chroot) root:/sources/gperf-3.1# make
...
(lfs chroot) root:/sources/gperf-3.1# make -j1 check
...
(lfs chroot) root:/sources/gperf-3.1# make install
...
```
### 8.39 Expat-2.6.0
```bash
(lfs chroot) root:/sources/expat-2.6.2# ./configure --prefix=/usr    \
>             --disable-static \
>             --docdir=/usr/share/doc/expat-2.6.2

(lfs chroot) root:/sources/expat-2.6.2# make
...
(lfs chroot) root:/sources/expat-2.6.2# make check
...
(lfs chroot) root:/sources/expat-2.6.2# make install
....
(lfs chroot) root:/sources/expat-2.6.2# install -v -m644 doc/*.{html,css} /usr/share/doc/expat-2.6.2
'doc/reference.html' -> '/usr/share/doc/expat-2.6.2/reference.html'
'doc/ok.min.css' -> '/usr/share/doc/expat-2.6.2/ok.min.css'
'doc/style.css' -> '/usr/share/doc/expat-2.6.2/style.css'
(lfs chroot) root:/sources/expat-2.6.2#
```
### 8.40 Inetutils-2.5
```bash
(lfs chroot) root:/sources# tar xf inetutils-2.5.tar.xz
(lfs chroot) root:/sources# cd inetutils-2.5
(lfs chroot) root:/sources/inetutils-2.5# ./configure --prefix=/usr        \
>             --bindir=/usr/bin    \
>             --localstatedir=/var \
>             --disable-logger     \
>             --disable-whois      \
>             --disable-rcp        \
>             --disable-rexec      \
>             --disable-rlogin     \
>             --disable-rsh        \
>             --disable-servers
...
(lfs chroot) root:/sources/inetutils-2.5# make
...
(lfs chroot) root:/sources/inetutils-2.5# make check
...
(lfs chroot) root:/sources/inetutils-2.5# make install
...
(lfs chroot) root:/sources/inetutils-2.5# mv -v /usr/{,s}bin/ifconfig
renamed '/usr/bin/ifconfig' -> '/usr/sbin/ifconfig'
(lfs chroot) root:/sources/inetutils-2.5#
```
### 8.41 Less-643
```bash
(lfs chroot) root:/sources# tar xf less-643.tar.gz
(lfs chroot) root:/sources# cd less-643
(lfs chroot) root:/sources/less-643# ./configure --prefix=/usr --sysconfdir=/etc
...
(lfs chroot) root:/sources/less-643# make
...
(lfs chroot) root:/sources/less-643# make check
...
(lfs chroot) root:/sources/less-643# make install
./mkinstalldirs /usr/bin /usr/share/man/man1
/usr/bin/install -c less /usr/bin/less
/usr/bin/install -c lesskey /usr/bin/lesskey
/usr/bin/install -c lessecho /usr/bin/lessecho
/usr/bin/install -c -m 644 ./less.nro /usr/share/man/man1/less.1
/usr/bin/install -c -m 644 ./lesskey.nro /usr/share/man/man1/lesskey.1
/usr/bin/install -c -m 644 ./lessecho.nro /usr/share/man/man1/lessecho.1
(lfs chroot) root:/sources/less-643#
```
### 8.42 Perl-5.38.2
```bash
(lfs chroot) root:/sources# tar xf perl-5.38.2.tar.xz
(lfs chroot) root:/sources# cd perl-5.38.2.tar.xz
bash: cd: perl-5.38.2.tar.xz: Not a directory
(lfs chroot) root:/sources# cd perl-5.38.2
(lfs chroot) root:/sources/perl-5.38.2# export BUILD_ZLIB=False
(lfs chroot) root:/sources/perl-5.38.2# export BUILD_BZIP2=0
(lfs chroot) root:/sources/perl-5.38.2#
(lfs chroot) root:/sources/perl-5.38.2# sh Configure -des                                         \
>              -Dprefix=/usr                                \
>              -Dvendorprefix=/usr                          \
>              -Dprivlib=/usr/lib/perl5/5.38/core_perl      \
>              -Darchlib=/usr/lib/perl5/5.38/core_perl      \
>              -Dsitelib=/usr/lib/perl5/5.38/site_perl      \
>              -Dsitearch=/usr/lib/perl5/5.38/site_perl     \
>              -Dvendorlib=/usr/lib/perl5/5.38/vendor_perl  \
>              -Dvendorarch=/usr/lib/perl5/5.38/vendor_perl \
>              -Dman1dir=/usr/share/man/man1                \
>              -Dman3dir=/usr/share/man/man3                \
>              -Dpager="/usr/bin/less -isR"                 \
>              -Duseshrplib                                 \
>              -Dusethreads
...
(lfs chroot) root:/sources/perl-5.38.2# make
...
(lfs chroot) root:/sources/perl-5.38.2# TEST_JOBS=$(nproc) make test_harness
...
(lfs chroot) root:/sources/perl-5.38.2# make install
...
(lfs chroot) root:/sources/perl-5.38.2# unset BUILD_ZLIB BUILD_BZIP2
(lfs chroot) root:/sources/perl-5.38.2#
```
### 8.43 XML::Parse-2.47
```bash
(lfs chroot) root:/sources# tar xf XML-Parser-2.47.tar.gz
(lfs chroot) root:/sources# cd XML-Parser-2.47
(lfs chroot) root:/sources/XML-Parser-2.47# perl Makefile.PL
Checking if your kit is complete...
Looks good
Warning: prerequisite LWP::UserAgent 0 not found.
Writing MYMETA.yml and MYMETA.json
Generating a Unix-style Makefile
Writing Makefile for XML::Parser
Writing MYMETA.yml and MYMETA.json
(lfs chroot) root:/sources/XML-Parser-2.47#
(lfs chroot) root:/sources/XML-Parser-2.47# make
...
(lfs chroot) root:/sources/XML-Parser-2.47# make test
...
(lfs chroot) root:/sources/XML-Parser-2.47# make install
...
```
### 8.44 Intltool-0.51.0
```bash
(lfs chroot) root:/sources# tar xf intltool-0.51.0.tar.gz
(lfs chroot) root:/sources# cd intltool-0.51.0
(lfs chroot) root:/sources/intltool-0.51.0# sed -i 's:\\\${:\\\$\\{:' intltool-update.in
(lfs chroot) root:/sources/intltool-0.51.0# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/intltool-0.51.0# make
...
(lfs chroot) root:/sources/intltool-0.51.0# make check
...
(lfs chroot) root:/sources/intltool-0.51.0# make install
...
(lfs chroot) root:/sources/intltool-0.51.0# install -v -Dm644 doc/I18N-HOWTO /usr/share/doc/intltool-0.51.0/I18N-HOWTO
install: creating directory '/usr/share/doc/intltool-0.51.0'
'doc/I18N-HOWTO' -> '/usr/share/doc/intltool-0.51.0/I18N-HOWTO'
(lfs chroot) root:/sources/intltool-0.51.0#
```
### 8.45 Autoconf-2.72
```bash
(lfs chroot) root:/sources# tar xf autoconf-2.72.tar.xz
(lfs chroot) root:/sources# cd autoconf-2.72
(lfs chroot) root:/sources/autoconf-2.72# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/autoconf-2.72# make
...
(lfs chroot) root:/sources/autoconf-2.72# make check
...
(lfs chroot) root:/sources/autoconf-2.72# make install
...
```
### 8.46 Automake-1.16.5
```bash
(lfs chroot) root:/sources# tar xf automake-1.16.5.tar.xz
(lfs chroot) root:/sources# cd automake-1.16.5
(lfs chroot) root:/sources/automake-1.16.5# ./configure --prefix=/usr --docdir=/usr/share/doc/automake-1.16.5
...
(lfs chroot) root:/sources/automake-1.16.5# make
...
(lfs chroot) root:/sources/automake-1.16.5# make -j$(($(nproc)>4?$(nproc):4)) check
...
(lfs chroot) root:/sources/automake-1.16.5# make install
...
```
### 8.47 OpenSSL-3.2.1
```bash
(lfs chroot) root:/sources# tar xf openssl-3.2.1.tar.gz
cd(lfs chroot) root:/sources# cd openssl-3.2.1
(lfs chroot) root:/sources/openssl-3.2.1# ./config --prefix=/usr         \
>          --openssldir=/etc/ssl \
>          --libdir=lib          \
>          shared                \
>          zlib-dynamic
Configuring OpenSSL version 3.2.1 for target linux-x86_64
Using os-specific seed configuration
Created configdata.pm
Running configdata.pm
Created Makefile.in
Created Makefile
Created include/openssl/configuration.h

**********************************************************************
***                                                                ***
***   OpenSSL has been successfully configured                     ***
***                                                                ***
***   If you encounter a problem while building, please open an    ***
***   issue on GitHub <https://github.com/openssl/openssl/issues>  ***
***   and include the output from the following command:           ***
***                                                                ***
***       perl configdata.pm --dump                                ***
***                                                                ***
***   (If you are new to OpenSSL, you might want to consult the    ***
***   'Troubleshooting' section in the INSTALL.md file first)      ***
***                                                                ***
**********************************************************************
(lfs chroot) root:/sources/openssl-3.2.1#
(lfs chroot) root:/sources/openssl-3.2.1# make
...
(lfs chroot) root:/sources/openssl-3.2.1# HARNESS_JOBS=$(nproc) make test
...
(lfs chroot) root:/sources/openssl-3.2.1# sed -i '/INSTALL_LIBS/s/libcrypto.a libssl.a//' Makefile
(lfs chroot) root:/sources/openssl-3.2.1# make MANSUFFIX=ssl install
...
(lfs chroot) root:/sources/openssl-3.2.1# mv -v /usr/share/doc/openssl /usr/share/doc/openssl-3.2.1
renamed '/usr/share/doc/openssl' -> '/usr/share/doc/openssl-3.2.1'
(lfs chroot) root:/sources/openssl-3.2.1#
...
(lfs chroot) root:/sources/openssl-3.2.1# cp -vfr doc/* /usr/share/doc/openssl-3.2.1
...
```
### 8.48 Kmod-31
```bash
(lfs chroot) root:/sources# tar xf kmod-31.tar.xz
(lfs chroot) root:/sources# cd kmod-31
(lfs chroot) root:/sources/kmod-31# ./configure --prefix=/usr          \
>             --sysconfdir=/etc      \
>             --with-openssl         \
>             --with-xz              \
>             --with-zstd            \
>             --with-zlib
...
(lfs chroot) root:/sources/kmod-31# make
...
(lfs chroot) root:/sources/kmod-31# make install
...
(lfs chroot) root:/sources/kmod-31# for target in depmod insmod modinfo modprobe rmmod; do
>   ln -sfv ../bin/kmod /usr/sbin/$target
> done
'/usr/sbin/depmod' -> '../bin/kmod'
'/usr/sbin/insmod' -> '../bin/kmod'
'/usr/sbin/modinfo' -> '../bin/kmod'
'/usr/sbin/modprobe' -> '../bin/kmod'
'/usr/sbin/rmmod' -> '../bin/kmod'
(lfs chroot) root:/sources/kmod-31#
(lfs chroot) root:/sources/kmod-31# ln -sfv kmod /usr/bin/lsmod
'/usr/bin/lsmod' -> 'kmod'
(lfs chroot) root:/sources/kmod-31#
```
### 8.49 Libelf from Elfutils-0.190
```bash
(lfs chroot) root:/sources# tar xf elfutils-0.190.tar.bz2
cd (lfs chroot) root:/sources# cd elfutils-0.190
(lfs chroot) root:/sources/elfutils-0.190# ./configure --prefix=/usr                \
>             --disable-debuginfod         \
>             --enable-libdebuginfod=dummy
...
(lfs chroot) root:/sources/elfutils-0.190# make
...
(lfs chroot) root:/sources/elfutils-0.190# make check
...
(lfs chroot) root:/sources/elfutils-0.190# make -C libelf install
make: Entering directory '/sources/elfutils-0.190/libelf'
make[1]: Entering directory '/sources/elfutils-0.190/libelf'
 /usr/bin/mkdir -p '/usr/include'
 /usr/bin/mkdir -p '/usr/lib'
 /usr/bin/mkdir -p '/usr/include/elfutils'
 /usr/bin/install -c -m 644  libelf.a '/usr/lib'
 /usr/bin/install -c -m 644 libelf.h gelf.h nlist.h '/usr/include'
 /usr/bin/install -c -m 644 elf-knowledge.h '/usr/include/elfutils'
 ( cd '/usr/lib' && ranlib libelf.a )
make[1]: Leaving directory '/sources/elfutils-0.190/libelf'
/bin/sh /sources/elfutils-0.190/config/install-sh -d /usr/lib
/usr/bin/install -c libelf.so /usr/lib/libelf-0.190.so
ln -fs libelf-0.190.so /usr/lib/libelf.so.1
ln -fs libelf.so.1 /usr/lib/libelf.so
make: Leaving directory '/sources/elfutils-0.190/libelf'
(lfs chroot) root:/sources/elfutils-0.190# install -vm644 config/libelf.pc /usr/lib/pkgconfig
'config/libelf.pc' -> '/usr/lib/pkgconfig/libelf.pc'
(lfs chroot) root:/sources/elfutils-0.190# rm /usr/lib/libelf.a
(lfs chroot) root:/sources/elfutils-0.190#
```
### 8.50 Libffi-3.4.4
```bash
(lfs chroot) root:/sources# tar xf libffi-3.4.4.tar.gz
(lfs chroot) root:/sources# cd libffi-3.4.4
(lfs chroot) root:/sources/libffi-3.4.4#
(lfs chroot) root:/sources/libffi-3.4.4# ./configure --prefix=/usr          \
>             --disable-static       \
>             --with-gcc-arch=native
...
(lfs chroot) root:/sources/libffi-3.4.4# make
...
(lfs chroot) root:/sources/libffi-3.4.4# make check
...
(lfs chroot) root:/sources/libffi-3.4.4# make install
...
```
### 8.51 Python-3.12.2
```bash
(lfs chroot) root:/sources# tar xf Python-3.12.2.tar.xz
(lfs chroot) root:/sources# cd Python-3.12.2
(lfs chroot) root:/sources/Python-3.12.2# ./configure --prefix=/usr        \
>             --enable-shared      \
>             --with-system-expat  \
>             --enable-optimizations
...
(lfs chroot) root:/sources/Python-3.12.2# make
...
(lfs chroot) root:/sources/Python-3.12.2# make install
...
(lfs chroot) root:/sources/Python-3.12.2# cat > /etc/pip.conf << EOF
> [global]
> root-user-action = ignore
> disable-pip-version-check = true
> EOF
(lfs chroot) root:/sources/Python-3.12.2# install -v -dm755 /usr/share/doc/python-3.12.2/html
install: creating directory '/usr/share/doc/python-3.12.2'
install: creating directory '/usr/share/doc/python-3.12.2/html'
(lfs chroot) root:/sources/Python-3.12.2# tar --no-same-owner \
>     -xvf ../python-3.12.2-docs-html.tar.bz2
...
(lfs chroot) root:/sources/Python-3.12.2# cp -R --no-preserve=mode python-3.12.2-docs-html/* \
>     /usr/share/doc/python-3.12.2/html
(lfs chroot) root:/sources/Python-3.12.2#
```
### 8.52 Flit-Core-3.9.0
```bash
(lfs chroot) root:/sources# tar xf flit_core-3.9.0.tar.gz
(lfs chroot) root:/sources# cd flit_core-3.9.0
(lfs chroot) root:/sources/flit_core-3.9.0# pip3 wheel -w dist --no-cache-dir --no-build-isolation --no-deps $PWD
Processing /sources/flit_core-3.9.0
  Preparing metadata (pyproject.toml) ... done
Building wheels for collected packages: flit_core
  Building wheel for flit_core (pyproject.toml) ... done
  Created wheel for flit_core: filename=flit_core-3.9.0-py3-none-any.whl size=63141 sha256=d61a541bb12e58406692ad78cb808a5fe5d746dac137e4619e4963489aef48a5
  Stored in directory: /tmp/pip-ephem-wheel-cache-v5z3h4o7/wheels/b6/fc/d9/1867098c7dd8bc9463aed01828eb04127f3a0565dcd57be316
Successfully built flit_core
(lfs chroot) root:/sources/flit_core-3.9.0#
(lfs chroot) root:/sources/flit_core-3.9.0# pip3 install --no-index --no-user --find-links dist flit_core
Looking in links: dist
Processing ./dist/flit_core-3.9.0-py3-none-any.whl
Installing collected packages: flit_core
Successfully installed flit_core-3.9.0
(lfs chroot) root:/sources/flit_core-3.9.0#
```
### 8.53 Wheel-0.42.0
```bash
(lfs chroot) root:/sources# tar xf wheel-0.42.0.tar.gz
(lfs chroot) root:/sources# cd wheel-0.42.0
(lfs chroot) root:/sources/wheel-0.42.0# pip3 wheel -w dist --no-cache-dir --no-build-isolation --no-deps $PWD
Processing /sources/wheel-0.42.0
  Preparing metadata (pyproject.toml) ... done
Building wheels for collected packages: wheel
  Building wheel for wheel (pyproject.toml) ... done
  Created wheel for wheel: filename=wheel-0.42.0-py3-none-any.whl size=65375 sha256=aa65537a94606a588446baf42051e993e220fc456d49d19752323cc2e7911cd7
  Stored in directory: /tmp/pip-ephem-wheel-cache-mamfoq23/wheels/02/94/16/334df4c2d9032c6eb640d74b51dd8388488b81261b1399a4fd
Successfully built wheel
(lfs chroot) root:/sources/wheel-0.42.0#
(lfs chroot) root:/sources/wheel-0.42.0# pip3 install --no-index --find-links=dist wheel
Looking in links: dist
Processing ./dist/wheel-0.42.0-py3-none-any.whl
Installing collected packages: wheel
Successfully installed wheel-0.42.0
(lfs chroot) root:/sources/wheel-0.42.0#
```
### 8.54 Setuptools-69.1.0
```bash
(lfs chroot) root:/sources# tar xf setuptools-69.1.0.tar.gz
(lfs chroot) root:/sources# cd setuptools-69.1.0
(lfs chroot) root:/sources/setuptools-69.1.0# pip3 wheel -w dist --no-cache-dir --no-build-isolation --no-deps $PWD
Processing /sources/setuptools-69.1.0
  Preparing metadata (pyproject.toml) ... done
Building wheels for collected packages: setuptools
  Building wheel for setuptools (pyproject.toml) ... done
  Created wheel for setuptools: filename=setuptools-69.1.0-py3-none-any.whl size=819314 sha256=5913efbbf6a4913e866b12ed7e3c852dd28929042b8ca94a64a5161dff824e55
  Stored in directory: /tmp/pip-ephem-wheel-cache-0w6ufu_p/wheels/9e/dc/53/648ca7a5e317475a9a283910378c5d5ab9a155688228c77eca
Successfully built setuptools
(lfs chroot) root:/sources/setuptools-69.1.0# pip3 install --no-index --find-links dist setuptools
Looking in links: dist
Processing ./dist/setuptools-69.1.0-py3-none-any.whl
Installing collected packages: setuptools
Successfully installed setuptools-69.1.0
(lfs chroot) root:/sources/setuptools-69.1.0#
```
### 8.55 Ninja-1.11.1
```bash
(lfs chroot) root:/sources# tar xf ninja-1.11.1.tar.gz
(lfs chroot) root:/sources# cd nin
bash: cd: nin: No such file or directory
(lfs chroot) root:/sources# cd ninja-1.11.1
(lfs chroot) root:/sources/ninja-1.11.1#
(lfs chroot) root:/sources/ninja-1.11.1# export NINJAJOBS=4
(lfs chroot) root:/sources/ninja-1.11.1# sed -i '/int Guess/a \
>   int   j = 0;\
>   char* jobs = getenv( "NINJAJOBS" );\
>   if ( jobs != NULL ) j = atoi( jobs );\
>   if ( j > 0 ) return j;\
> ' src/ninja.cc
(lfs chroot) root:/sources/ninja-1.11.1# python3 configure.py --bootstrap
...
(lfs chroot) root:/sources/ninja-1.11.1# ./ninja ninja_test
[22/22] LINK ninja_test
(lfs chroot) root:/sources/ninja-1.11.1# ./ninja_test --gtest_filter=-SubprocessTest.SetWithLots
[384/384] ElideMiddle.ElideInTheMiddle
passed
(lfs chroot) root:/sources/ninja-1.11.1#
(lfs chroot) root:/sources/ninja-1.11.1# install -vm755 ninja /usr/bin/
'ninja' -> '/usr/bin/ninja'
(lfs chroot) root:/sources/ninja-1.11.1# install -vDm644 misc/bash-completion /usr/share/bash-completion/completions/ninja
'misc/bash-completion' -> '/usr/share/bash-completion/completions/ninja'
(lfs chroot) root:/sources/ninja-1.11.1# install -vDm644 misc/zsh-completion  /usr/share/zsh/site-functions/_ninja
install: creating directory '/usr/share/zsh'
install: creating directory '/usr/share/zsh/site-functions'
'misc/zsh-completion' -> '/usr/share/zsh/site-functions/_ninja'
(lfs chroot) root:/sources/ninja-1.11.1#
```
### 8.56 Meson-1.3.2
```bash
(lfs chroot) root:/sources# tar xf meson-1.3.2.tar.gz
(lfs chroot) root:/sources# cd meson-1.3.2
(lfs chroot) root:/sources/meson-1.3.2# pip3 wheel -w dist --no-cache-dir --no-build-isolation --no-deps $PWD
Processing /sources/meson-1.3.2
  Preparing metadata (pyproject.toml) ... done
Building wheels for collected packages: meson
  Building wheel for meson (pyproject.toml) ... done
  Created wheel for meson: filename=meson-1.3.2-py3-none-any.whl size=977700 sha256=f749279c8b67d25f1376675152fc3383c5a0d945158fd5052061142174f59062
  Stored in directory: /tmp/pip-ephem-wheel-cache-4eu1hnir/wheels/22/35/7b/685fa5e0df89cbe0b89b4075adf0b71c0255152a1000c1fa88
Successfully built meson
(lfs chroot) root:/sources/meson-1.3.2# pip3 install --no-index --find-links dist meson
Looking in links: dist
Processing ./dist/meson-1.3.2-py3-none-any.whl
Installing collected packages: meson
Successfully installed meson-1.3.2
(lfs chroot) root:/sources/meson-1.3.2#
(lfs chroot) root:/sources/meson-1.3.2# install -vDm644 data/shell-completions/bash/meson /usr/share/bash-completion/completions/meson
'data/shell-completions/bash/meson' -> '/usr/share/bash-completion/completions/meson'
(lfs chroot) root:/sources/meson-1.3.2# install -vDm644 data/shell-completions/zsh/_meson /usr/share/zsh/site-functions/_meson
'data/shell-completions/zsh/_meson' -> '/usr/share/zsh/site-functions/_meson'
(lfs chroot) root:/sources/meson-1.3.2#
```
### 8.57 Coreutils-9.4
```bash
(lfs chroot) root:/sources# tar xf coreutils-9.4.tar.xz
(lfs chroot) root:/sources# cd coreutils-9.4
(lfs chroot) root:/sources/coreutils-9.4# patch -Np1 -i ../coreutils-9.4-i18n-1.patch
patching file bootstrap.conf
patching file configure.ac
patching file src/cut.c
patching file src/expand-common.c
patching file src/expand-common.h
patching file src/expand.c
patching file src/fold.c
patching file src/join.c
patching file src/local.mk
patching file src/pr.c
patching file src/sort.c
patching file src/unexpand.c
patching file src/uniq.c
patching file tests/Coreutils.pm
patching file tests/expand/mb.sh
patching file tests/i18n/sort.sh
patching file tests/local.mk
patching file tests/misc/expand.pl
patching file tests/misc/fold.pl
patching file tests/misc/join.pl
patching file tests/misc/unexpand.pl
patching file tests/pr/pr-tests.pl
patching file tests/sort/sort-mb-tests.sh
patching file tests/sort/sort-merge.pl
patching file tests/sort/sort.pl
patching file tests/unexpand/mb.sh
patching file tests/uniq/uniq.pl
patching file lib/linebuffer.h
patching file lib/mbfile.c
patching file lib/mbfile.h
patching file m4/mbfile.m4
(lfs chroot) root:/sources/coreutils-9.4# sed -e '/n_out += n_hold/,+4 s|.*bufsize.*|//&|' \
>     -i src/split.c
(lfs chroot) root:/sources/coreutils-9.4# autoreconf -fiv
(lfs chroot) root:/sources/coreutils-9.4# FORCE_UNSAFE_CONFIGURE=1 ./configure \
>             --prefix=/usr            \
>             --enable-no-install-program=kill,uptime
...
(lfs chroot) root:/sources/coreutils-9.4# make
...
(lfs chroot) root:/sources/coreutils-9.4# make NON_ROOT_USERNAME=tester check-root
...
(lfs chroot) root:/sources/coreutils-9.4# groupadd -g 102 dummy -U tester
(lfs chroot) root:/sources/coreutils-9.4# chown -R tester .
(lfs chroot) root:/sources/coreutils-9.4#
(lfs chroot) root:/sources/coreutils-9.4# su tester -c "PATH=$PATH make RUN_EXPENSIVE_TESTS=yes check"
...
(lfs chroot) root:/sources/coreutils-9.4# groupdel dummy
(lfs chroot) root:/sources/coreutils-9.4# make install
...
(lfs chroot) root:/sources/coreutils-9.4# mv -v /usr/bin/chroot /usr/sbin
renamed '/usr/bin/chroot' -> '/usr/sbin/chroot'
(lfs chroot) root:/sources/coreutils-9.4# mv -v /usr/share/man/man1/chroot.1 /usr/share/man/man8/chroot.8
renamed '/usr/share/man/man1/chroot.1' -> '/usr/share/man/man8/chroot.8'
(lfs chroot) root:/sources/coreutils-9.4# sed -i 's/"1"/"8"/' /usr/share/man/man8/chroot.8
(lfs chroot) root:/sources/coreutils-9.4#
```
### 8.58 Check-0.15.2
```bash
(lfs chroot) root:/sources# tar xf check-0.15.2.tar.gz
(lfs chroot) root:/sources# cd check-0.15.2
(lfs chroot) root:/sources/check-0.15.2# ./configure --prefix=/usr --disable-static
...
(lfs chroot) root:/sources/check-0.15.2# make
...
(lfs chroot) root:/sources/check-0.15.2# make check
...
(lfs chroot) root:/sources/check-0.15.2# make docdir=/usr/share/doc/check-0.15.2 install
...
```
### 8.59 Diffutils-3.10
```bash
(lfs chroot) root:/sources# tar xf diffutils-3.10.tar.xz
(lfs chroot) root:/sources# cd diffutils-3.10
(lfs chroot) root:/sources/diffutils-3.10#
(lfs chroot) root:/sources/diffutils-3.10# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/diffutils-3.10# make
...
(lfs chroot) root:/sources/diffutils-3.10# make check
...
(lfs chroot) root:/sources/diffutils-3.10# make install
...
```
### 8.60 Gawk-5.3.0
```bash
(lfs chroot) root:/sources# rm -rf gawk-5.3.0
(lfs chroot) root:/sources# tar xf gawk-5.3.0.tar.xz
(lfs chroot) root:/sources# cd gawk-5.3.0
(lfs chroot) root:/sources/gawk-5.3.0# sed -i 's/extras//' Makefile.in
(lfs chroot) root:/sources/gawk-5.3.0# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/gawk-5.3.0# make
...
(lfs chroot) root:/sources/gawk-5.3.0# chown -R tester .
(lfs chroot) root:/sources/gawk-5.3.0# su tester -c "PATH=$PATH make check"
...
(lfs chroot) root:/sources/gawk-5.3.0# rm -f /usr/bin/gawk-5.3.0
(lfs chroot) root:/sources/gawk-5.3.0# make install
...
(lfs chroot) root:/sources/gawk-5.3.0# ln -sv gawk.1 /usr/share/man/man1/awk.1
'/usr/share/man/man1/awk.1' -> 'gawk.1'
(lfs chroot) root:/sources/gawk-5.3.0# mkdir -pv                                   /usr/share/doc/gawk-5.3.0
mkdir: created directory '/usr/share/doc/gawk-5.3.0'
(lfs chroot) root:/sources/gawk-5.3.0# cp    -v doc/{awkforai.txt,*.{eps,pdf,jpg}} /usr/share/doc/gawk-5.3.0
'doc/awkforai.txt' -> '/usr/share/doc/gawk-5.3.0/awkforai.txt'
'doc/gawk_api-figure1.eps' -> '/usr/share/doc/gawk-5.3.0/gawk_api-figure1.eps'
'doc/gawk_api-figure2.eps' -> '/usr/share/doc/gawk-5.3.0/gawk_api-figure2.eps'
'doc/gawk_api-figure3.eps' -> '/usr/share/doc/gawk-5.3.0/gawk_api-figure3.eps'
'doc/gawk_array-elements.eps' -> '/usr/share/doc/gawk-5.3.0/gawk_array-elements.eps'
'doc/gawk_general-program.eps' -> '/usr/share/doc/gawk-5.3.0/gawk_general-program.eps'
'doc/gawk_process-flow.eps' -> '/usr/share/doc/gawk-5.3.0/gawk_process-flow.eps'
'doc/gawk_statist.eps' -> '/usr/share/doc/gawk-5.3.0/gawk_statist.eps'
'doc/lflashlight.eps' -> '/usr/share/doc/gawk-5.3.0/lflashlight.eps'
'doc/rflashlight.eps' -> '/usr/share/doc/gawk-5.3.0/rflashlight.eps'
'doc/gawk_api-figure1.pdf' -> '/usr/share/doc/gawk-5.3.0/gawk_api-figure1.pdf'
'doc/gawk_api-figure2.pdf' -> '/usr/share/doc/gawk-5.3.0/gawk_api-figure2.pdf'
'doc/gawk_api-figure3.pdf' -> '/usr/share/doc/gawk-5.3.0/gawk_api-figure3.pdf'
'doc/gawk_array-elements.pdf' -> '/usr/share/doc/gawk-5.3.0/gawk_array-elements.pdf'
'doc/gawk_general-program.pdf' -> '/usr/share/doc/gawk-5.3.0/gawk_general-program.pdf'
'doc/gawk_process-flow.pdf' -> '/usr/share/doc/gawk-5.3.0/gawk_process-flow.pdf'
'doc/gawk_statist.pdf' -> '/usr/share/doc/gawk-5.3.0/gawk_statist.pdf'
'doc/lflashlight.pdf' -> '/usr/share/doc/gawk-5.3.0/lflashlight.pdf'
'doc/rflashlight.pdf' -> '/usr/share/doc/gawk-5.3.0/rflashlight.pdf'
'doc/gawk_statist.jpg' -> '/usr/share/doc/gawk-5.3.0/gawk_statist.jpg'
(lfs chroot) root:/sources/gawk-5.3.0#
```
### 8.61 Findutils-4.9.0
```bash
(lfs chroot) root:/sources# rm -rf findutils-4.9.0
(lfs chroot) root:/sources# tar xf findutils-4.9.0.tar.xz
(lfs chroot) root:/sources# cd findutils-4.9.0
(lfs chroot) root:/sources/findutils-4.9.0# ./configure --prefix=/usr --localstatedir=/var/lib/locate
...
(lfs chroot) root:/sources/findutils-4.9.0# make
...
(lfs chroot) root:/sources/findutils-4.9.0# chown -R tester .
(lfs chroot) root:/sources/findutils-4.9.0# su tester -c "PATH=$PATH make check"
...
(lfs chroot) root:/sources/findutils-4.9.0# make install
...
```
### 8.62 Groff-1.23.0
```bash
(lfs chroot) root:/sources# tar xf groff-1.23.0.tar.gz
(lfs chroot) root:/sources# cd groff-1.23.0
(lfs chroot) root:/sources/groff-1.23.0# PAGE=A4 ./configure --prefix=/usr
...
(lfs chroot) root:/sources/groff-1.23.0# make
...
(lfs chroot) root:/sources/groff-1.23.0# make check
...
(lfs chroot) root:/sources/groff-1.23.0# make install
...
```
### 8.63 Grub-2.12
```bash
(lfs chroot) root:/sources# tar xf grub-2.12.tar.xz
cd (lfs chroot) root:/sources# cd grub-2.12
(lfs chroot) root:/sources/grub-2.12# unset {C,CPP,CXX,LD}FLAGS
(lfs chroot) root:/sources/grub-2.12# echo depends bli part_gpt > grub-core/extra_deps.lst
(lfs chroot) root:/sources/grub-2.12# ./configure --prefix=/usr          \
>             --sysconfdir=/etc      \
>             --disable-efiemu       \
>             --disable-werror
...
(lfs chroot) root:/sources/grub-2.12# make
...
(lfs chroot) root:/sources/grub-2.12# make install
...
(lfs chroot) root:/sources/grub-2.12# mv -v /etc/bash_completion.d/grub /usr/share/bash-completion/completions
copied '/etc/bash_completion.d/grub' -> '/usr/share/bash-completion/completions/grub'
removed '/etc/bash_completion.d/grub'
(lfs chroot) root:/sources/grub-2.12#
```
### 8.64 Gzip-1.13
```bash
(lfs chroot) root:/sources# rm -rf gzip-1.13
(lfs chroot) root:/sources# tar xf gzip-1.13.tar.xz
(lfs chroot) root:/sources# cd gzip-1.13
(lfs chroot) root:/sources/gzip-1.13# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/gzip-1.13# make
...
(lfs chroot) root:/sources/gzip-1.13# make check
...
(lfs chroot) root:/sources/gzip-1.13# make install
...
```
### 8.65 IPRoute2-6.7.0
```bash
(lfs chroot) root:/sources# tar xf iproute2-6.7.0.tar.xz
(lfs chroot) root:/sources# cd iproute2-6.7.0
(lfs chroot) root:/sources/iproute2-6.7.0# sed -i /ARPD/d Makefile
(lfs chroot) root:/sources/iproute2-6.7.0# rm -fv man/man8/arpd.8
removed 'man/man8/arpd.8'
(lfs chroot) root:/sources/iproute2-6.7.0# make NETNS_RUN_DIR=/run/netns
...
(lfs chroot) root:/sources/iproute2-6.7.0# make SBINDIR=/usr/sbin install
...
(lfs chroot) root:/sources/iproute2-6.7.0# mkdir -pv             /usr/share/doc/iproute2-6.7.0
mkdir: created directory '/usr/share/doc/iproute2-6.7.0'
(lfs chroot) root:/sources/iproute2-6.7.0# cp -v COPYING README* /usr/share/doc/iproute2-6.7.0
'COPYING' -> '/usr/share/doc/iproute2-6.7.0/COPYING'
'README' -> '/usr/share/doc/iproute2-6.7.0/README'
'README.devel' -> '/usr/share/doc/iproute2-6.7.0/README.devel'
(lfs chroot) root:/sources/iproute2-6.7.0#
```
### 8.66 Kbd-2.6.4
```bash
(lfs chroot) root:/sources# rm -rf kbd-2.6.4
(lfs chroot) root:/sources# tar xf kbd-2.6.4.tar.xz
(lfs chroot) root:/sources# cd kbd-2.6.4
(lfs chroot) root:/sources/kbd-2.6.4# patch -Np1 -i ../kbd-2.6.4-backspace-1.patch
patching file data/keymaps/i386/dvorak/dvorak-l.map
patching file data/keymaps/i386/dvorak/dvorak-r.map
patching file data/keymaps/i386/fgGIod/tr_f-latin5.map
patching file data/keymaps/i386/qwerty/lt.l4.map
patching file data/keymaps/i386/qwerty/lt.map
patching file data/keymaps/i386/qwerty/no-latin1.map
patching file data/keymaps/i386/qwerty/ru1.map
patching file data/keymaps/i386/qwerty/ru2.map
patching file data/keymaps/i386/qwerty/ru-cp1251.map
patching file data/keymaps/i386/qwerty/ru-ms.map
patching file data/keymaps/i386/qwerty/ru_win.map
patching file data/keymaps/i386/qwerty/se-ir209.map
patching file data/keymaps/i386/qwerty/se-lat6.map
patching file data/keymaps/i386/qwerty/tr_q-latin5.map
patching file data/keymaps/i386/qwerty/ua.map
patching file data/keymaps/i386/qwerty/ua-utf.map
patching file data/keymaps/i386/qwerty/ua-utf-ws.map
patching file data/keymaps/i386/qwerty/ua-ws.map
(lfs chroot) root:/sources/kbd-2.6.4#
(lfs chroot) root:/sources/kbd-2.6.4# sed -i '/RESIZECONS_PROGS=/s/yes/no/' configure
(lfs chroot) root:/sources/kbd-2.6.4# sed -i 's/resizecons.8 //' docs/man/man8/Makefile.in
(lfs chroot) root:/sources/kbd-2.6.4#
(lfs chroot) root:/sources/kbd-2.6.4# ./configure --prefix=/usr --disable-vlocky
...
(lfs chroot) root:/sources/kbd-2.6.4# make
...
(lfs chroot) root:/sources/kbd-2.6.4# make check
...
(lfs chroot) root:/sources/kbd-2.6.4# make install
...
(lfs chroot) root:/sources/kbd-2.6.4# cp -R -v docs/doc -T /usr/share/doc/kbd-2.6.4
...
```
### 8.67 Libpipeline-1.5.7
```bash
(lfs chroot) root:/sources# ls libpipeline-1.5.7.tar.gz
libpipeline-1.5.7.tar.gz
(lfs chroot) root:/sources# tar xf libpipeline-1.5.7.tar.gz
(lfs chroot) root:/sources# cd libpipeline-1.5.7
(lfs chroot) root:/sources/libpipeline-1.5.7# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/libpipeline-1.5.7# make
...
(lfs chroot) root:/sources/libpipeline-1.5.7# make check
...
(lfs chroot) root:/sources/libpipeline-1.5.7# make install
...
```
### 8.68 Make-4.4.1
```bash
(lfs chroot) root:/sources# ls make-4.4.1
ABOUT-NLS  Makefile      README.DOS      SCOPTIONS     build_w32.bat  doc           po
AUTHORS    Makefile.am   README.OS2      aclocal.m4    builddos.bat   lib           src
Basic.mk   Makefile.in   README.VMS      build-aux     config.log     m4            tests
COPYING    NEWS          README.W32      build.cfg     config.status  make          vms_export_symbol_test.com
ChangeLog  README        README.customs  build.cfg.in  configure      makefile.com
INSTALL    README.Amiga  README.zOS      build.sh      configure.ac   mk
(lfs chroot) root:/sources# rm -rf make-4.4.1
(lfs chroot) root:/sources# tar xf make-4.4.1.tar.gz
(lfs chroot) root:/sources# cd make-4.4.1
(lfs chroot) root:/sources/make-4.4.1#
(lfs chroot) root:/sources/make-4.4.1# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/make-4.4.1# make
...
(lfs chroot) root:/sources/make-4.4.1# chown -R tester .
(lfs chroot) root:/sources/make-4.4.1# su tester -c "PATH=$PATH make check"
...
(lfs chroot) root:/sources/make-4.4.1# make install
...
```
### 8.69 Path-2.7.6
```bash
(lfs chroot) root:/sources# ls patch-2.7.6
AUTHORS    ChangeLog-2011  Makefile     NEWS    aclocal.m4  cfg.mk      config.log     configure.ac  maint.mk   src
COPYING    GNUmakefile     Makefile.am  README  bootstrap   config.h    config.status  lib           patch.man  stamp-h1
ChangeLog  INSTALL         Makefile.in  TODO    build-aux   config.hin  configure      m4            pc         tests
(lfs chroot) root:/sources# rm -rf patch-2.7.6
(lfs chroot) root:/sources# tar xf patch-2.7.6.tar.xz
(lfs chroot) root:/sources# cd patch-2.7.6
(lfs chroot) root:/sources/patch-2.7.6# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/patch-2.7.6# make
...
(lfs chroot) root:/sources/patch-2.7.6# make check
...
(lfs chroot) root:/sources/patch-2.7.6# make install
...
```
### 8.70 Tar-1.35
```bash
(lfs chroot) root:/sources# rm -rf tar-1.35
(lfs chroot) root:/sources# tar xf tar-1.35.tar.xz
(lfs chroot) root:/sources# cd tar-1.35
(lfs chroot) root:/sources/tar-1.35# FORCE_UNSAFE_CONFIGURE=1  \
> ./configure --prefix=/usr
...
(lfs chroot) root:/sources/tar-1.35# make
...
(lfs chroot) root:/sources/tar-1.35# make check
...
(lfs chroot) root:/sources/tar-1.35# make install
..
(lfs chroot) root:/sources/tar-1.35# make -C doc install-html docdir=/usr/share/doc/tar-1.35
make: Entering directory '/sources/tar-1.35/doc'
  MAKEINFO tar.html
 /usr/bin/mkdir -p '/usr/share/doc/tar-1.35'
 /usr/bin/mkdir -p '/usr/share/doc/tar-1.35/tar.html'
 /usr/bin/install -c -m 644 'tar.html'/* '/usr/share/doc/tar-1.35/tar.html'
make: Leaving directory '/sources/tar-1.35/doc'
(lfs chroot) root:/sources/tar-1.35#
```
### 8.71 Texinfo-7.1
```bash
(lfs chroot) root:/sources# rm -rf texinfo-7.1
r(lfs chroot) root:/sources# tar xf texinfo-7.1.tar.xz
(lfs chroot) root:/sources# cd texinfo-7.1
(lfs chroot) root:/sources/texinfo-7.1# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/texinfo-7.1# make
...
lfs chroot) root:/sources/texinfo-7.1# make check
...
lfs chroot) root:/sources/texinfo-7.1# make install
...
(lfs chroot) root:/sources/texinfo-7.1# make TEXMF=/usr/share/texmf install-tex
...
```
### 8.72 Vim-9.1.0041
```bash
(lfs chroot) root:/sources# tar -xf vim-9.1.0041.tar.gz
cd(lfs chroot) root:/sources# cd vim-9.1.0041
(lfs chroot) root:/sources/vim-9.1.0041# echo '#define SYS_VIMRC_FILE "/etc/vimrc"' >> src/feature.h
(lfs chroot) root:/sources/vim-9.1.0041# ./configure --prefix=/usr
...
(lfs chroot) root:/sources/vim-9.1.0041# make
...
(lfs chroot) root:/sources/vim-9.1.0041# chown -R tester .
(lfs chroot) root:/sources/vim-9.1.0041# su tester -c "TERM=xterm-256color LANG=en_US.UTF-8 make -j1 test" \
>    &> vim-test.log
(lfs chroot) root:/sources/vim-9.1.0041# less vim-test.log
(lfs chroot) root:/sources/vim-9.1.0041# make install
...
(lfs chroot) root:/sources/vim-9.1.0041# ln -sv vim /usr/bin/vi
'/usr/bin/vi' -> 'vim'
(lfs chroot) root:/sources/vim-9.1.0041# for L in  /usr/share/man/{,*/}man1/vim.1; do
>     ln -sv vim.1 $(dirname $L)/vi.1
> done
'/usr/share/man/man1/vi.1' -> 'vim.1'
'/usr/share/man/da.ISO8859-1/man1/vi.1' -> 'vim.1'
'/usr/share/man/da.UTF-8/man1/vi.1' -> 'vim.1'
'/usr/share/man/da/man1/vi.1' -> 'vim.1'
'/usr/share/man/de.ISO8859-1/man1/vi.1' -> 'vim.1'
'/usr/share/man/de.UTF-8/man1/vi.1' -> 'vim.1'
'/usr/share/man/de/man1/vi.1' -> 'vim.1'
'/usr/share/man/fr.ISO8859-1/man1/vi.1' -> 'vim.1'
'/usr/share/man/fr.UTF-8/man1/vi.1' -> 'vim.1'
'/usr/share/man/fr/man1/vi.1' -> 'vim.1'
'/usr/share/man/it.ISO8859-1/man1/vi.1' -> 'vim.1'
'/usr/share/man/it.UTF-8/man1/vi.1' -> 'vim.1'
'/usr/share/man/it/man1/vi.1' -> 'vim.1'
'/usr/share/man/ja/man1/vi.1' -> 'vim.1'
'/usr/share/man/pl.ISO8859-2/man1/vi.1' -> 'vim.1'
'/usr/share/man/pl.UTF-8/man1/vi.1' -> 'vim.1'
'/usr/share/man/pl/man1/vi.1' -> 'vim.1'
'/usr/share/man/ru.KOI8-R/man1/vi.1' -> 'vim.1'
'/usr/share/man/ru.UTF-8/man1/vi.1' -> 'vim.1'
'/usr/share/man/tr.ISO8859-9/man1/vi.1' -> 'vim.1'
'/usr/share/man/tr.UTF-8/man1/vi.1' -> 'vim.1'
'/usr/share/man/tr/man1/vi.1' -> 'vim.1'
(lfs chroot) root:/sources/vim-9.1.0041#
(lfs chroot) root:/sources/vim-9.1.0041# ln -sv ../vim/vim91/doc /usr/share/doc/vim-9.1.0041
'/usr/share/doc/vim-9.1.0041' -> '../vim/vim91/doc'
(lfs chroot) root:/sources/vim-9.1.0041#
(lfs chroot) root:/sources/vim-9.1.0041# cat > /etc/vimrc << "EOF"
> " Begin /etc/vimrc
> " Ensure defaults are set before customizing settings, not after
> source $VIMRUNTIME/defaults.vim
> let skip_defaults_vim=1
> set nocompatible
> set backspace=2
> set mouse=
> syntax on
> if (&term == "xterm") || (&term == "putty")
>   set background=dark
> endif
> " End /etc/vimrc
> EOF
(lfs chroot) root:/sources/vim-9.1.0041#
```
### 8.73 MarkupSafe-2.1.5
```bash
(lfs chroot) root:/sources# tar xf MarkupSafe-2.1.5.tar.gz
(lfs chroot) root:/sources# cd MarkupSafe-2.1.5
(lfs chroot) root:/sources/MarkupSafe-2.1.5# pip3 wheel -w dist --no-cache-dir --no-build-isolation --no-deps $PWD
Processing /sources/MarkupSafe-2.1.5
  Preparing metadata (setup.py) ... done
Building wheels for collected packages: MarkupSafe
  Building wheel for MarkupSafe (setup.py) ... done
  Created wheel for MarkupSafe: filename=MarkupSafe-2.1.5-cp312-cp312-linux_x86_64.whl size=28207 sha256=1fca476f7d1b074ba48fecfd0a7383f2c9c09715cde18e835751db805bcc90ca
  Stored in directory: /tmp/pip-ephem-wheel-cache-j678i7qr/wheels/9c/21/74/f259dcee52a6b4bb13a12df2edc72ab5d9a9bb46ad350a1b4e
Successfully built MarkupSafe
(lfs chroot) root:/sources/MarkupSafe-2.1.5#
(lfs chroot) root:/sources/MarkupSafe-2.1.5# pip3 install --no-index --no-user --find-links dist Markupsafe
Looking in links: dist
Processing ./dist/MarkupSafe-2.1.5-cp312-cp312-linux_x86_64.whl
Installing collected packages: Markupsafe
Successfully installed Markupsafe-2.1.5
(lfs chroot) root:/sources/MarkupSafe-2.1.5#
```
### 8.74 Jinja2-3.1.3
```bash
(lfs chroot) root:/sources# tar xf Jinja2-3.1.3.tar.gz
(lfs chroot) root:/sources# cd Jinja2-3.1.3
(lfs chroot) root:/sources/Jinja2-3.1.3# pip3 wheel -w dist --no-cache-dir --no-build-isolation --no-deps $PWD
Processing /sources/Jinja2-3.1.3
  Preparing metadata (setup.py) ... done
Building wheels for collected packages: Jinja2
  Building wheel for Jinja2 (setup.py) ... done
  Created wheel for Jinja2: filename=Jinja2-3.1.3-py3-none-any.whl size=133236 sha256=4b1771fc170c71ee8e7f703d300b378363fdefad65771e0565db71eb8aa6d159
  Stored in directory: /tmp/pip-ephem-wheel-cache-urk2hkhk/wheels/fb/ef/cf/1f58c0e9cb1941e91e76da88c981090a45a8e6928aaaad649a
Successfully built Jinja2
(lfs chroot) root:/sources/Jinja2-3.1.3#
(lfs chroot) root:/sources/Jinja2-3.1.3# pip3 install --no-index --no-user --find-links dist Jinja2
Looking in links: dist
Processing ./dist/Jinja2-3.1.3-py3-none-any.whl
Requirement already satisfied: MarkupSafe>=2.0 in /usr/lib/python3.12/site-packages (from Jinja2) (2.1.5)
Installing collected packages: Jinja2
Successfully installed Jinja2-3.1.3
(lfs chroot) root:/sources/Jinja2-3.1.3#
```
### 8.75 Udev from Systemd-255
```bash
(lfs chroot) root:/sources# tar xf systemd-255.tar.gz
c(lfs chroot) root:/sources# cd systemd-255
(lfs chroot) root:/sources/systemd-255# sed -i -e 's/GROUP="render"/GROUP="video"/' \
>        -e 's/GROUP="sgx", //' rules.d/50-udev-default.rules.in
(lfs chroot) root:/sources/systemd-255# sed '/NETWORK_DIRS/s/systemd/udev/' -i src/basic/path-lookup.h
(lfs chroot) root:/sources/systemd-255# mkdir -p build
(lfs chroot) root:/sources/systemd-255# cd       build
(lfs chroot) root:/sources/systemd-255/build# ls
(lfs chroot) root:/sources/systemd-255/build#
(lfs chroot) root:/sources/systemd-255/build# meson setup \
>       --prefix=/usr                 \
>       --buildtype=release           \
>       -Dmode=release                \
>       -Ddev-kvm-mode=0660           \
>       -Dlink-udev-shared=false      \
>       -Dlogind=false                \
>       -Dvconsole=false              \
>       ..
...
(lfs chroot) root:/sources/systemd-255/build# export udev_helpers=$(grep "'name' :" ../src/udev/meson.build | \
>                       awk '{print $3}' | tr -d ",'" | grep -v 'udevadm')
(lfs chroot) root:/sources/systemd-255/build# echo $udev_helpers
ata_id cdrom_id dmi_memory_id fido_id iocost mtd_probe scsi_id v4l_id
(lfs chroot) root:/sources/systemd-255/build# ninja udevadm systemd-hwdb                                           \
>       $(ninja -n | grep -Eo '(src/(lib)?udev|rules.d|hwdb.d)/[^ ]*') \
>       $(realpath libudev.so --relative-to .)                         \
>       $udev_helpers
...
(lfs chroot) root:/sources/systemd-255/build# install -vm755 -d {/usr/lib,/etc}/udev/{hwdb.d,rules.d,network}
install: creating directory '/usr/lib/udev'
install: creating directory '/usr/lib/udev/hwdb.d'
install: creating directory '/usr/lib/udev/rules.d'
install: creating directory '/usr/lib/udev/network'
install: creating directory '/etc/udev'
install: creating directory '/etc/udev/hwdb.d'
install: creating directory '/etc/udev/rules.d'
install: creating directory '/etc/udev/network'
(lfs chroot) root:/sources/systemd-255/build# install -vm755 -d /usr/{lib,share}/pkgconfig
install: creating directory '/usr/share/pkgconfig'
(lfs chroot) root:/sources/systemd-255/build# install -vm755 udevadm                             /usr/bin/
'udevadm' -> '/usr/bin/udevadm'
(lfs chroot) root:/sources/systemd-255/build# install -vm755 systemd-hwdb                        /usr/bin/udev-hwdb
'systemd-hwdb' -> '/usr/bin/udev-hwdb'
(lfs chroot) root:/sources/systemd-255/build# ln      -svfn  ../bin/udevadm                      /usr/sbin/udevd
'/usr/sbin/udevd' -> '../bin/udevadm'
(lfs chroot) root:/sources/systemd-255/build#
(lfs chroot) root:/sources/systemd-255/build# install -vm644 ../src/libudev/libudev.h            /usr/include/
'../src/libudev/libudev.h' -> '/usr/include/libudev.h'
(lfs chroot) root:/sources/systemd-255/build# install -vm644 src/libudev/*.pc                    /usr/lib/pkgconfig/
'src/libudev/libudev.pc' -> '/usr/lib/pkgconfig/libudev.pc'
(lfs chroot) root:/sources/systemd-255/build# install -vm644 src/udev/*.pc                       /usr/share/pkgconfig/
'src/udev/udev.pc' -> '/usr/share/pkgconfig/udev.pc'
(lfs chroot) root:/sources/systemd-255/build# install -vm644 ../src/udev/udev.conf               /etc/udev/
'../src/udev/udev.conf' -> '/etc/udev/udev.conf'
(lfs chroot) root:/sources/systemd-255/build# install -vm644 rules.d/* ../rules.d/README         /usr/lib/udev/rules.d/
'rules.d/50-udev-default.rules' -> '/usr/lib/udev/rules.d/50-udev-default.rules'
'rules.d/60-persistent-storage.rules' -> '/usr/lib/udev/rules.d/60-persistent-storage.rules'
'rules.d/64-btrfs.rules' -> '/usr/lib/udev/rules.d/64-btrfs.rules'
'rules.d/99-systemd.rules' -> '/usr/lib/udev/rules.d/99-systemd.rules'
'../rules.d/README' -> '/usr/lib/udev/rules.d/README'
(lfs chroot) root:/sources/systemd-255/build# install -vm644 $(find ../rules.d/*.rules \
>                       -not -name '*power-switch*') /usr/lib/udev/rules.d/
'../rules.d/60-autosuspend.rules' -> '/usr/lib/udev/rules.d/60-autosuspend.rules'
'../rules.d/60-block.rules' -> '/usr/lib/udev/rules.d/60-block.rules'
'../rules.d/60-cdrom_id.rules' -> '/usr/lib/udev/rules.d/60-cdrom_id.rules'
'../rules.d/60-dmi-id.rules' -> '/usr/lib/udev/rules.d/60-dmi-id.rules'
'../rules.d/60-drm.rules' -> '/usr/lib/udev/rules.d/60-drm.rules'
'../rules.d/60-evdev.rules' -> '/usr/lib/udev/rules.d/60-evdev.rules'
'../rules.d/60-fido-id.rules' -> '/usr/lib/udev/rules.d/60-fido-id.rules'
'../rules.d/60-infiniband.rules' -> '/usr/lib/udev/rules.d/60-infiniband.rules'
'../rules.d/60-input-id.rules' -> '/usr/lib/udev/rules.d/60-input-id.rules'
'../rules.d/60-persistent-alsa.rules' -> '/usr/lib/udev/rules.d/60-persistent-alsa.rules'
'../rules.d/60-persistent-input.rules' -> '/usr/lib/udev/rules.d/60-persistent-input.rules'
'../rules.d/60-persistent-storage-mtd.rules' -> '/usr/lib/udev/rules.d/60-persistent-storage-mtd.rules'
'../rules.d/60-persistent-storage-tape.rules' -> '/usr/lib/udev/rules.d/60-persistent-storage-tape.rules'
'../rules.d/60-persistent-v4l.rules' -> '/usr/lib/udev/rules.d/60-persistent-v4l.rules'
'../rules.d/60-sensor.rules' -> '/usr/lib/udev/rules.d/60-sensor.rules'
'../rules.d/60-serial.rules' -> '/usr/lib/udev/rules.d/60-serial.rules'
'../rules.d/70-camera.rules' -> '/usr/lib/udev/rules.d/70-camera.rules'
'../rules.d/70-joystick.rules' -> '/usr/lib/udev/rules.d/70-joystick.rules'
'../rules.d/70-memory.rules' -> '/usr/lib/udev/rules.d/70-memory.rules'
'../rules.d/70-mouse.rules' -> '/usr/lib/udev/rules.d/70-mouse.rules'
'../rules.d/70-touchpad.rules' -> '/usr/lib/udev/rules.d/70-touchpad.rules'
'../rules.d/75-net-description.rules' -> '/usr/lib/udev/rules.d/75-net-description.rules'
'../rules.d/75-probe_mtd.rules' -> '/usr/lib/udev/rules.d/75-probe_mtd.rules'
'../rules.d/78-sound-card.rules' -> '/usr/lib/udev/rules.d/78-sound-card.rules'
'../rules.d/80-drivers.rules' -> '/usr/lib/udev/rules.d/80-drivers.rules'
'../rules.d/80-net-setup-link.rules' -> '/usr/lib/udev/rules.d/80-net-setup-link.rules'
'../rules.d/81-net-dhcp.rules' -> '/usr/lib/udev/rules.d/81-net-dhcp.rules'
'../rules.d/82-net-auto-link-local.rules' -> '/usr/lib/udev/rules.d/82-net-auto-link-local.rules'
'../rules.d/90-iocost.rules' -> '/usr/lib/udev/rules.d/90-iocost.rules'
(lfs chroot) root:/sources/systemd-255/build# install -vm644 hwdb.d/*  ../hwdb.d/{*.hwdb,README} /usr/lib/udev/hwdb.d/
'hwdb.d/60-autosuspend-chromiumos.hwdb' -> '/usr/lib/udev/hwdb.d/60-autosuspend-chromiumos.hwdb'
'../hwdb.d/20-OUI.hwdb' -> '/usr/lib/udev/hwdb.d/20-OUI.hwdb'
'../hwdb.d/20-acpi-vendor.hwdb' -> '/usr/lib/udev/hwdb.d/20-acpi-vendor.hwdb'
'../hwdb.d/20-bluetooth-vendor-product.hwdb' -> '/usr/lib/udev/hwdb.d/20-bluetooth-vendor-product.hwdb'
'../hwdb.d/20-dmi-id.hwdb' -> '/usr/lib/udev/hwdb.d/20-dmi-id.hwdb'
'../hwdb.d/20-net-ifname.hwdb' -> '/usr/lib/udev/hwdb.d/20-net-ifname.hwdb'
'../hwdb.d/20-pci-classes.hwdb' -> '/usr/lib/udev/hwdb.d/20-pci-classes.hwdb'
'../hwdb.d/20-pci-vendor-model.hwdb' -> '/usr/lib/udev/hwdb.d/20-pci-vendor-model.hwdb'
'../hwdb.d/20-sdio-classes.hwdb' -> '/usr/lib/udev/hwdb.d/20-sdio-classes.hwdb'
'../hwdb.d/20-sdio-vendor-model.hwdb' -> '/usr/lib/udev/hwdb.d/20-sdio-vendor-model.hwdb'
'../hwdb.d/20-usb-classes.hwdb' -> '/usr/lib/udev/hwdb.d/20-usb-classes.hwdb'
'../hwdb.d/20-usb-vendor-model.hwdb' -> '/usr/lib/udev/hwdb.d/20-usb-vendor-model.hwdb'
'../hwdb.d/20-vmbus-class.hwdb' -> '/usr/lib/udev/hwdb.d/20-vmbus-class.hwdb'
'../hwdb.d/60-autosuspend-fingerprint-reader.hwdb' -> '/usr/lib/udev/hwdb.d/60-autosuspend-fingerprint-reader.hwdb'
'../hwdb.d/60-autosuspend.hwdb' -> '/usr/lib/udev/hwdb.d/60-autosuspend.hwdb'
'../hwdb.d/60-evdev.hwdb' -> '/usr/lib/udev/hwdb.d/60-evdev.hwdb'
'../hwdb.d/60-input-id.hwdb' -> '/usr/lib/udev/hwdb.d/60-input-id.hwdb'
'../hwdb.d/60-keyboard.hwdb' -> '/usr/lib/udev/hwdb.d/60-keyboard.hwdb'
'../hwdb.d/60-seat.hwdb' -> '/usr/lib/udev/hwdb.d/60-seat.hwdb'
'../hwdb.d/60-sensor.hwdb' -> '/usr/lib/udev/hwdb.d/60-sensor.hwdb'
'../hwdb.d/70-analyzers.hwdb' -> '/usr/lib/udev/hwdb.d/70-analyzers.hwdb'
'../hwdb.d/70-av-production.hwdb' -> '/usr/lib/udev/hwdb.d/70-av-production.hwdb'
'../hwdb.d/70-cameras.hwdb' -> '/usr/lib/udev/hwdb.d/70-cameras.hwdb'
'../hwdb.d/70-joystick.hwdb' -> '/usr/lib/udev/hwdb.d/70-joystick.hwdb'
'../hwdb.d/70-mouse.hwdb' -> '/usr/lib/udev/hwdb.d/70-mouse.hwdb'
'../hwdb.d/70-pda.hwdb' -> '/usr/lib/udev/hwdb.d/70-pda.hwdb'
'../hwdb.d/70-pointingstick.hwdb' -> '/usr/lib/udev/hwdb.d/70-pointingstick.hwdb'
'../hwdb.d/70-sound-card.hwdb' -> '/usr/lib/udev/hwdb.d/70-sound-card.hwdb'
'../hwdb.d/70-touchpad.hwdb' -> '/usr/lib/udev/hwdb.d/70-touchpad.hwdb'
'../hwdb.d/80-ieee1394-unit-function.hwdb' -> '/usr/lib/udev/hwdb.d/80-ieee1394-unit-function.hwdb'
'../hwdb.d/82-net-auto-link-local.hwdb' -> '/usr/lib/udev/hwdb.d/82-net-auto-link-local.hwdb'
'../hwdb.d/README' -> '/usr/lib/udev/hwdb.d/README'
(lfs chroot) root:/sources/systemd-255/build# install -vm755 $udev_helpers                       /usr/lib/udev
'ata_id' -> '/usr/lib/udev/ata_id'
'cdrom_id' -> '/usr/lib/udev/cdrom_id'
'dmi_memory_id' -> '/usr/lib/udev/dmi_memory_id'
'fido_id' -> '/usr/lib/udev/fido_id'
'iocost' -> '/usr/lib/udev/iocost'
'mtd_probe' -> '/usr/lib/udev/mtd_probe'
'scsi_id' -> '/usr/lib/udev/scsi_id'
'v4l_id' -> '/usr/lib/udev/v4l_id'
(lfs chroot) root:/sources/systemd-255/build# install -vm644 ../network/99-default.link          /usr/lib/udev/network
'../network/99-default.link' -> '/usr/lib/udev/network/99-default.link'
(lfs chroot) root:/sources/systemd-255/build#
(lfs chroot) root:/sources/systemd-255/build# tar -xvf ../../udev-lfs-20230818.tar.xz
udev-lfs-20230818/
udev-lfs-20230818/init-net-rules.sh
udev-lfs-20230818/rule_generator.functions
udev-lfs-20230818/Makefile.lfs
udev-lfs-20230818/write_cd_rules
udev-lfs-20230818/55-lfs.rules
udev-lfs-20230818/README
udev-lfs-20230818/contrib/
udev-lfs-20230818/contrib/debian/
udev-lfs-20230818/contrib/debian/write_cd_aliases
udev-lfs-20230818/contrib/debian/81-cdrom.rules
udev-lfs-20230818/contrib/debian/83-cdrom-symlinks.rules
udev-lfs-20230818/55-lfs.txt
udev-lfs-20230818/ChangeLog
udev-lfs-20230818/write_net_rules
(lfs chroot) root:/sources/systemd-255/build# make -f udev-lfs-20230818/Makefile.lfs install
mkdir: created directory '/usr/share/doc/udev-20230818'
mkdir: created directory '/usr/share/doc/udev-20230818/lfs'
'udev-lfs-20230818/55-lfs.rules' -> '/etc/udev/rules.d/55-lfs.rules'
'udev-lfs-20230818/init-net-rules.sh' -> '/usr/lib/udev/init-net-rules.sh'
'udev-lfs-20230818/write_net_rules' -> '/usr/lib/udev/write_net_rules'
'udev-lfs-20230818/rule_generator.functions' -> '/usr/lib/udev/rule_generator.functions'
'udev-lfs-20230818/README' -> '/usr/share/doc/udev-20230818/lfs/README'
'udev-lfs-20230818/55-lfs.txt' -> '/usr/share/doc/udev-20230818/lfs/55-lfs.txt'
(lfs chroot) root:/sources/systemd-255/build#
(lfs chroot) root:/sources/systemd-255/build# tar -xf ../../systemd-man-pages-255.tar.xz                            \
>     --no-same-owner --strip-components=1                              \
>     -C /usr/share/man --wildcards '*/udev*' '*/libudev*'              \
>                                   '*/systemd.link.5'                  \
>                                   '*/systemd-'{hwdb,udevd.service}.8
(lfs chroot) root:/sources/systemd-255/build# sed 's|systemd/network|udev/network|'                                 \
>     /usr/share/man/man5/systemd.link.5                                \
>   > /usr/share/man/man5/udev.link.5
(lfs chroot) root:/sources/systemd-255/build# sed 's/systemd\(\\\?-\)/udev\1/' /usr/share/man/man8/systemd-hwdb.8   \
>                                > /usr/share/man/man8/udev-hwdb.8
(lfs chroot) root:/sources/systemd-255/build# sed 's|lib.*udevd|sbin/udevd|'                                        \
>     /usr/share/man/man8/systemd-udevd.service.8                       \
>   > /usr/share/man/man8/udevd.8
(lfs chroot) root:/sources/systemd-255/build# rm /usr/share/man/man*/systemd*
(lfs chroot) root:/sources/systemd-255/build# unset udev_helpers
(lfs chroot) root:/sources/systemd-255/build#
```
#### 8.75.2 Configuring Udev
```bash
(lfs chroot) root:/sources/systemd-255/build# udev-hwdb update
(lfs chroot) root:/sources/systemd-255/build#
```
### 8.76 Man-DB-2.12.0
```bash
(lfs chroot) root:/sources# tar xf man-db-2.12.0.tar.xz
(lfs chroot) root:/sources# cd man-db-2.12.0
(lfs chroot) root:/sources/man-db-2.12.0# ./configure --prefix=/usr                         \
>             --docdir=/usr/share/doc/man-db-2.12.0 \
>             --sysconfdir=/etc                     \
>             --disable-setuid                      \
>             --enable-cache-owner=bin              \
>             --with-browser=/usr/bin/lynx          \
>             --with-vgrind=/usr/bin/vgrind         \
>             --with-grap=/usr/bin/grap             \
>             --with-systemdtmpfilesdir=            \
>             --with-systemdsystemunitdir=
...
(lfs chroot) root:/sources/man-db-2.12.0# make
...
(lfs chroot) root:/sources/man-db-2.12.0# make install
...
```
### 8.77 Procps-ng-4.0.4
```bash
(lfs chroot) root:/sources# tar xf procps-ng-4.0.4.tar.xz
(lfs chroot) root:/sources# cd procps-ng-4.0.4
(lfs chroot) root:/sources/procps-ng-4.0.4# ./configure --prefix=/usr                           \
>             --docdir=/usr/share/doc/procps-ng-4.0.4 \
>             --disable-static                        \
>             --disable-kill
...
(lfs chroot) root:/sources/procps-ng-4.0.4# make
...
(lfs chroot) root:/sources/procps-ng-4.0.4# make -k check
...
(lfs chroot) root:/sources/procps-ng-4.0.4# make install
...
```
### 8.78 Util-linux-2.39.3
```bash
(lfs chroot) root:/sources# rm -rf util-linux-2.39.3
(lfs chroot) root:/sources# tar xf util-linux-2.39.3.tar.xz
c(lfs chroot) root:/sources# cd util-linux-2.39.3
(lfs chroot) root:/sources/util-linux-2.39.3# sed -i '/test_mkfds/s/^/#/' tests/helpers/Makemodule.am
(lfs chroot) root:/sources/util-linux-2.39.3# ./configure --bindir=/usr/bin    \
>             --libdir=/usr/lib    \
>             --runstatedir=/run   \
>             --sbindir=/usr/sbin  \
>             --disable-chfn-chsh  \
>             --disable-login      \
>             --disable-nologin    \
>             --disable-su         \
>             --disable-setpriv    \
>             --disable-runuser    \
>             --disable-pylibmount \
>             --disable-static     \
>             --without-python     \
>             --without-systemd    \
>             --without-systemdsystemunitdir        \
>             ADJTIME_PATH=/var/lib/hwclock/adjtime \
>             --docdir=/usr/share/doc/util-linux-2.39.3
...
(lfs chroot) root:/sources/util-linux-2.39.3# make
...
(lfs chroot) root:/sources/util-linux-2.39.3# chown -R tester .
(lfs chroot) root:/sources/util-linux-2.39.3# su tester -c "make -k check"
...
(lfs chroot) root:/sources/util-linux-2.39.3# make install
...
```
### 8.79 E2fsprogs-1.47.0
```bash
(lfs chroot) root:/sources# tar xf e2fsprogs-1.47.0.tar.gz
(lfs chroot) root:/sources# cd e2fsprogs-1.47.0
(lfs chroot) root:/sources/e2fsprogs-1.47.0# mkdir -v build
mkdir: created directory 'build'
(lfs chroot) root:/sources/e2fsprogs-1.47.0# cd       build
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# ../configure --prefix=/usr           \
>              --sysconfdir=/etc       \
>              --enable-elf-shlibs     \
>              --disable-libblkid      \
>              --disable-libuuid       \
>              --disable-uuidd         \
>              --disable-fsck
...
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# make
...
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# make check
...
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# make install
...
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# rm -fv /usr/lib/{libcom_err,libe2p,libext2fs,libss}.a
removed '/usr/lib/libcom_err.a'
removed '/usr/lib/libe2p.a'
removed '/usr/lib/libext2fs.a'
removed '/usr/lib/libss.a'
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build#
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# gunzip -v /usr/share/info/libext2fs.info.gz
/usr/share/info/libext2fs.info.gz:       79.8% -- replaced with /usr/share/info/libext2fs.info
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# install-info --dir-file=/usr/share/info/dir /usr/share/info/libext2fs.info
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build#
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# makeinfo -o      doc/com_err.info ../lib/et/com_err.texinfo
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# install -v -m644 doc/com_err.info /usr/share/info
'doc/com_err.info' -> '/usr/share/info/com_err.info'
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# install-info --dir-file=/usr/share/info/dir /usr/share/info/com_err.info
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build#
```
#### 8.79.2 Configuring E2fsprogs
```bash
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build# sed 's/metadata_csum_seed,//' -i /etc/mke2fs.conf
(lfs chroot) root:/sources/e2fsprogs-1.47.0/build#
```
### 8.80 Sysklogd-1.5.1
```bash
(lfs chroot) root:/sources# tar xf sysklogd-1.5.1.tar.gz
(lfs chroot) root:/sources# cd sysklogd-1.5.1
(lfs chroot) root:/sources/sysklogd-1.5.1# sed -i '/Error loading kernel symbols/{n;n;d}' ksym_mod.c
(lfs chroot) root:/sources/sysklogd-1.5.1# sed -i 's/union wait/int/' syslogd.c
(lfs chroot) root:/sources/sysklogd-1.5.1# make
...
(lfs chroot) root:/sources/sysklogd-1.5.1# make BINDIR=/sbin install
/usr/bin/install -o root -g root -m 644 sysklogd.8 /usr/share/man/man8/sysklogd.8
/usr/bin/install -m 500 -s syslogd /sbin/syslogd
/usr/bin/install -o root -g root -m 644 syslogd.8 /usr/share/man/man8/syslogd.8
/usr/bin/install -o root -g root -m 644 syslog.conf.5 /usr/share/man/man5/syslog.conf.5
/usr/bin/install -o root -g root -m 644 klogd.8 /usr/share/man/man8/klogd.8
/usr/bin/install -m 500 -s klogd /sbin/klogd
(lfs chroot) root:/sources/sysklogd-1.5.1#
(lfs chroot) root:/sources/sysklogd-1.5.1# cat > /etc/syslog.conf << "EOF"
> # Begin /etc/syslog.conf
> auth,authpriv.* -/var/log/auth.log
> *.*;auth,authpriv.none -/var/log/sys.log
> daemon.* -/var/log/daemon.log
> kern.* -/var/log/kern.log
> mail.* -/var/log/mail.log
> user.* -/var/log/user.log
> *.emerg *
> # End /etc/syslog.conf
> EOF
(lfs chroot) root:/sources/sysklogd-1.5.1#
```
### 8.81 Sysvinit-3.08
```bash
(lfs chroot) root:/sources# tar xf sysvinit-3.08.tar.xz
(lfs chroot) root:/sources# cd sysvinit-3.08
(lfs chroot) root:/sources/sysvinit-3.08# patch -Np1 -i ../sysvinit-3.08-consolidated-1.patch
patching file src/Makefile
(lfs chroot) root:/sources/sysvinit-3.08# make
...
(lfs chroot) root:/sources/sysvinit-3.08# make install
...
```
### 8.84 Cleaning up
```bash
(lfs chroot) root:/sources/sysvinit-3.08# rm -rf /tmp/*
(lfs chroot) root:/sources/sysvinit-3.08# find /usr/lib /usr/libexec -name \*.la -delete
(lfs chroot) root:/sources/sysvinit-3.08# userdel -r tester
userdel: tester mail spool (/var/mail/tester) not found
(lfs chroot) root:/sources/sysvinit-3.08#
```
## 9 System Configuration

### 9.2 LFS-Bootscripts-20230728
```bash
(lfs chroot) root:/sources# tar xf lfs-bootscripts-20230728.tar.xz
(lfs chroot) root:/sources# cd lfs-bootscripts-20230728
(lfs chroot) root:/sources/lfs-bootscripts-20230728# make install
...
```
### 9.4 Managing Devices

##### 9.4.1.2 Creating Custom Udev Rules
```bash
(lfs chroot) root:/sys/bus# bash /usr/lib/udev/init-net-rules.sh
(lfs chroot) root:/sys/bus# ls /etc/udev/rules.d/70-persistent-net.rules
/etc/udev/rules.d/70-persistent-net.rules
(lfs chroot) root:/sys/bus# less /etc/udev/rules.d/70-persistent-net.rules
(lfs chroot) root:/sys/bus# cat /etc/udev/rules.d/70-persistent-net.rules
# This file was automatically generated by the /lib/udev/write_net_rules
# program, run by the persistent-net-generator.rules rules file.
#
# You can modify it, as long as you keep each rule on a single
# line, and change only the value of the NAME= key.

# net device e1000
SUBSYSTEM=="net", ACTION=="add", DRIVERS=="?*", ATTR{address}=="08:00:27:9e:1d:82", ATTR{dev_id}=="0x0", ATTR{type}=="1", NAME="enp0s3"

# net device e1000
SUBSYSTEM=="net", ACTION=="add", DRIVERS=="?*", ATTR{address}=="08:00:27:7a:18:15", ATTR{dev_id}=="0x0", ATTR{type}=="1", NAME="enp0s8"
(lfs chroot) root:/sys/bus#
(lfs chroot) root:/sys/bus# sed -e '/^AlternativeNamesPolicy/s/=.*$/=/'  \
>     -i /usr/lib/udev/network/99-default.link \
>      > /etc/udev/network/99-default.link
```
I think the book is wrong, need to delete to get content
```bash
(lfs chroot) root:/sys/bus# sed -e '/^AlternativeNamesPolicy/s/=.*$/=/'  \
>      /usr/lib/udev/network/99-default.link \
>  > /etc/udev/network/99-default.link
(lfs chroot) root:/sys/bus#
```

#### 9.5.2 Creating the /etc/resolv.conf File
```bash
(lfs chroot) root:/sys#
cat > /etc/resolv.conf << "EOF"
# Begin /etc/resolv.conf
# domain <Your Domain Name>
# nameserver <IP address of your primary nameserver>
# nameserver <IP address of your secondary nameserver>
nameserver 8.8.8.8
nameserver 114.114.114.114
# # End /etc/resolv.conf
# EOF
bash: warning: here-document at line 1 delimited by end-of-file (wanted `EOF')
(lfs chroot) root:/sys#
```
#### 9.5.3 Configuring hostname
```bash
(lfs chroot) root:~# echo "lfs" > /etc/hostname
(lfs chroot) root:~#
```
#### 9.5.4 Set /etc/hosts file
```bash
(lfs chroot) root:~#
cat > /etc/hosts << "EOF"
# Begin /etc/hosts
127.0.0.1 localhost.localdomain localhost
::1       localhost ip6-localhost ip6-loopback
ff02::1   ip6-allnodes
ff02::2   ip6-allrouters
# End /etc/hosts
EOF
(lfs chroot) root:~#
```
### 9.6 Configuring Sysvint
```bash
(lfs chroot) root:~# cat > /etc/inittab << "EOF"
> # Begin /etc/inittab
> id:3:initdefault:
> si::sysinit:/etc/rc.d/init.d/rc S
> l0:0:wait:/etc/rc.d/init.d/rc 0
> l1:S1:wait:/etc/rc.d/init.d/rc 1
> l2:2:wait:/etc/rc.d/init.d/rc 2
> l3:3:wait:/etc/rc.d/init.d/rc 3
> l4:4:wait:/etc/rc.d/init.d/rc 4
> l5:5:wait:/etc/rc.d/init.d/rc 5
> l6:6:wait:/etc/rc.d/init.d/rc 6
> ca:12345:ctrlaltdel:/sbin/shutdown -t1 -a -r now
> su:S06:once:/sbin/sulogin
> s1:1:respawn:/sbin/sulogin
> 1:2345:respawn:/sbin/agetty --noclear tty1 9600
> 2:2345:respawn:/sbin/agetty tty2 9600
> 3:2345:respawn:/sbin/agetty tty3 9600
> 4:2345:respawn:/sbin/agetty tty4 9600
> 5:2345:respawn:/sbin/agetty tty5 9600
> 6:2345:respawn:/sbin/agetty tty6 9600
> # End /etc/inittab
> EOF
(lfs chroot) root:~#
```
#### 9.6.4 Configuring the System Clock
```bash
(lfs chroot) root:/etc/rc.d# hwclock --localtime --show
2024-05-25 02:58:27.853636+08:00
(lfs chroot) root:/etc/rc.d# date
Sat May 25 10:59:17 CST 2024
(lfs chroot) root:/etc/rc.d#
(lfs chroot) root:/etc/rc.d# cat > /etc/sysconfig/clock << "EOF"
> # Begin /etc/sysconfig/clock
> UTC=1
> # Set this to any options you might need to give to hwclock,
> # such as machine hardware clock type for Alphas.
> CLOCKPARAMS=
> # End /etc/sysconfig/clock
> EOF
(lfs chroot) root:/etc/rc.d#
```
#### 9.6.5 Configuring the Linux Console
```bash
(lfs chroot) root:/etc/rc.d# cat > /etc/sysconfig/console << "EOF"
> # Begin /etc/sysconfig/console
> UNICODE="1"
> FONT="Lat2-Terminus16"
> # End /etc/sysconfig/console
> EOF
(lfs chroot) root:/etc/rc.d#
```
#### 9.6.6 Creating Files at Boot
```bash
(lfs chroot) root:/etc/rc.d# echo "/tmp/.ICE-unix dir 777 root root" >> /etc/sysconfig/createfiles
(lfs chroot) root:/etc/rc.d# cat /etc/sysconfig/createfiles
########################################################################
# Begin /etc/sysconfig/createfiles
#
# Description : Createfiles script config file
#
# Authors     :
#
# Version     : 00.00
#
# Notes       : The syntax of this file is as follows:
#               if type is equal to "file" or "dir"
#                <filename> <type> <permissions> <user> <group>
#               if type is equal to "dev"
#                <filename> <type> <permissions> <user> <group> <devtype>
#             <major> <minor>
#
#               <filename> is the name of the file which is to be created
#               <type> is either file, dir, or dev.
#                       file creates a new file
#                       dir creates a new directory
#                       dev creates a new device
#               <devtype> is either block, char or pipe
#                       block creates a block device
#                       char creates a character device
#                       pipe creates a pipe, this will ignore the <major> and
#           <minor> fields
#               <major> and <minor> are the major and minor numbers used for
#     the device.
########################################################################

# End /etc/sysconfig/createfiles
/tmp/.ICE-unix dir 777 root root
(lfs chroot) root:/etc/rc.d#
```
##### 9.6.8.1 Customize rc.site
```bash
(lfs chroot) root:/etc/sysconfig# grep -E -v "^(#|$)" rc.site
SKIPTMPCLEAN=y
(lfs chroot) root:/etc/sysconfig#
```
### 9.7 Configuring the System Locale
```bash
(lfs chroot) root:/etc/sysconfig# locale -a | grep CN
bo_CN
bo_CN.utf8
ug_CN
ug_CN.utf8
zh_CN
zh_CN.gb18030
zh_CN.gb2312
zh_CN.gbk
zh_CN.utf8
(lfs chroot) root:/etc/sysconfig# locale -a | grep en_US
en_US
en_US.iso88591
en_US.utf8
(lfs chroot) root:/etc/sysconfig# LC_ALL=en_US.utf8 locale charmap
UTF-8
(lfs chroot) root:/etc/sysconfig#
(lfs chroot) root:/etc/sysconfig#
LC_ALL=en_US.utf8 locale language
American English
LC_ALL=en_US.utf8 locale charmap
UTF-8
LC_ALL=en_US.utf8 locale int_curr_symbol
USD
LC_ALL=en_US.utf8 locale int_prefix
1
(lfs chroot) root:/etc/sysconfig#
cat > /etc/profile << "EOF"
# Begin /etc/profile
for i in $(locale); do
  unset ${i%=*}
done
if [[ "$TERM" = linux ]]; then
  export LANG=C.UTF-8
else
  export LANG=en_US.UTF-8
fi
# End /etc/profile
EOF
(lfs chroot) root:/etc/sysconfig#
```
### 9.8 Creating /etc/inputrc
```bash
(lfs chroot) root:/etc/sysconfig# cat > /etc/inputrc << "EOF"
> # Begin /etc/inputrc
> # Modified by Chris Lynn <roryo@roryo.dynup.net>
> # Allow the command prompt to wrap to the next line
> set horizontal-scroll-mode Off
> # Enable 8-bit input
> set meta-flag On
> set input-meta On
> # Turns off 8th bit stripping
> set convert-meta Off
> # Keep the 8th bit for display
> set output-meta On
> # none, visible or audible
> set bell-style none
> # All of the following map the escape sequence of the value
> # contained in the 1st argument to the readline specific functions
> "\eOd": backward-word
> "\eOc": forward-word
> # for linux console
> "\e[1~": beginning-of-line
> "\e[4~": end-of-line
> "\e[5~": beginning-of-history
> "\e[6~": end-of-history
> "\e[3~": delete-char
> "\e[2~": quoted-insert
> # for xterm
> "\eOH": beginning-of-line
> "\eOF": end-of-line
> # for Konsole
> "\e[H": beginning-of-line
> "\e[F": end-of-line
> # End /etc/inputrc
> EOF
(lfs chroot) root:/etc/sysconfig#
```
### 9.9 Creating /etc/shells
```bash
(lfs chroot) root:/etc/sysconfig# cat > /etc/shells << "EOF"
> # Begin /etc/shells
> /bin/sh
> /bin/bash
> # End /etc/shells
> EOF
(lfs chroot) root:/etc/sysconfig#
```
## 10 Making the LFS System Bootable
```bash
(lfs chroot) root:/etc/sysconfig#
cat > /etc/fstab << "EOF"
# Begin /etc/fstab
# file system  mount-point    type     options             dump  fsck
#                                                                order
/dev/disk/by-partlabel/root / ext4   defaults      1     1
/dev/disk/by-partlabel/boot /boot ext4   defaults      1     1
/dev/disk/by-partlabel/boot-uefi /boot/efi ext4   defaults      1     1
/dev/disk/by-partlabel/usr /usr ext4   defaults      1     1
/dev/disk/by-partlabel/home /home ext4   defaults      1     1
/dev/disk/by-partlabel/opt /opt ext4   defaults      1     1
/dev/disk/by-partlabel/tmp /tmp ext4   defaults      1     1
/dev/disk/by-partlabel/usr-src /usr/src ext4   defaults      1     1
/dev/disk/by-partlabel/swap  swap                    swap   pri=1                      0  0

proc           /proc          proc     nosuid,noexec,nodev 0     0
sysfs          /sys           sysfs    nosuid,noexec,nodev 0     0
devpts         /dev/pts       devpts   gid=5,mode=620      0     0
tmpfs          /run           tmpfs    defaults            0     0
devtmpfs       /dev           devtmpfs mode=0755,nosuid    0     0
tmpfs          /dev/shm       tmpfs    nosuid,nodev        0     0
cgroup2        /sys/fs/cgroup cgroup2  nosuid,noexec,nodev 0     0
# End /etc/fstab
EOF
(lfs chroot) root:/etc/sysconfig#
```
### 10.3 Linux-6.7.4
```bash
(lfs chroot) root:/sources# rm -rf linux-6.7.4
(lfs chroot) root:/sources# tar xf linux-6.7.4.tar.xz
(lfs chroot) root:/sources# cd linux-6.7.4
(lfs chroot) root:/sources/linux-6.7.4# make mrproper
(lfs chroot) root:/sources/linux-6.7.4# make defconfig
  HOSTCC  scripts/kconfig/conf.o
  HOSTLD  scripts/kconfig/conf
*** Default configuration is based on 'x86_64_defconfig'
#
# configuration written to .config
#
(lfs chroot) root:/sources/linux-6.7.4#
(lfs chroot) root:/sources/linux-6.7.4# make menuconfig


Your configuration changes were NOT saved.

configuration written to .config

*** End of the configuration.
*** Execute 'make' to start the build or try 'make help'.

(lfs chroot) root:/sources/linux-6.7.4#
(lfs chroot) root:/sources/linux-6.7.4#
(lfs chroot) root:/sources/linux-6.7.4# make
...
(lfs chroot) root:/sources/linux-6.7.4# make modules_install
  SYMLINK /lib/modules/6.7.4/build
  INSTALL /lib/modules/6.7.4/modules.order
  INSTALL /lib/modules/6.7.4/modules.builtin
  INSTALL /lib/modules/6.7.4/modules.builtin.modinfo
  INSTALL /lib/modules/6.7.4/kernel/fs/efivarfs/efivarfs.ko
  INSTALL /lib/modules/6.7.4/kernel/drivers/thermal/intel/x86_pkg_temp_thermal.ko
  INSTALL /lib/modules/6.7.4/kernel/net/netfilter/nf_log_syslog.ko
  INSTALL /lib/modules/6.7.4/kernel/net/netfilter/xt_mark.ko
  INSTALL /lib/modules/6.7.4/kernel/net/netfilter/xt_nat.ko
  INSTALL /lib/modules/6.7.4/kernel/net/netfilter/xt_LOG.ko
  INSTALL /lib/modules/6.7.4/kernel/net/netfilter/xt_MASQUERADE.ko
  INSTALL /lib/modules/6.7.4/kernel/net/netfilter/xt_addrtype.ko
  INSTALL /lib/modules/6.7.4/kernel/net/ipv4/netfilter/iptable_nat.ko
  DEPMOD  /lib/modules/6.7.4
(lfs chroot) root:/sources/linux-6.7.4#
(lfs chroot) root:/sources/linux-6.7.4# df -h /boot/
Filesystem      Size  Used Avail Use% Mounted on
/dev/sdd1       181M   15K  168M   1% /boot
(lfs chroot) root:/sources/linux-6.7.4# cp -iv arch/x86/boot/bzImage /boot/vmlinuz-6.7.4-lfs-12.1
'arch/x86/boot/bzImage' -> '/boot/vmlinuz-6.7.4-lfs-12.1'
(lfs chroot) root:/sources/linux-6.7.4# cp -iv System.map /boot/System.map-6.7.4
'System.map' -> '/boot/System.map-6.7.4'
(lfs chroot) root:/sources/linux-6.7.4#
(lfs chroot) root:/sources/linux-6.7.4# cp -iv .config /boot/config-6.7.4
'.config' -> '/boot/config-6.7.4'
(lfs chroot) root:/sources/linux-6.7.4#
(lfs chroot) root:/sources/linux-6.7.4# cp -r Documentation -T /usr/share/doc/linux-6.7.4
(lfs chroot) root:/sources/linux-6.7.4# 
(lfs chroot) root:/sources# chown -R 0:0 linux-6.7.4
(lfs chroot) root:/sources#
```
### 10.3.2 Configuring Linux Module Load Order
```bash
(lfs chroot) root:/sources/linux-6.7.4# install -v -m755 -d /etc/modprobe.d
install: creating directory '/etc/modprobe.d'
(lfs chroot) root:/sources/linux-6.7.4# cat > /etc/modprobe.d/usb.conf << "EOF"
> # Begin /etc/modprobe.d/usb.conf
> install ohci_hcd /sbin/modprobe ehci_hcd ; /sbin/modprobe -i ohci_hcd ; true
> install uhci_hcd /sbin/modprobe ehci_hcd ; /sbin/modprobe -i uhci_hcd ; true
> # End /etc/modprobe.d/usb.conf
> EOF
(lfs chroot) root:/sources/linux-6.7.4#
```
### 10.4 using GRUB to Set Up the Boot Process

I miss to create a 1-2M grub boot partition, now fix it
```bash
(parted) p
Model: ATA VBOX HARDDISK (scsi)
Disk /dev/sdd: 115GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags:

Number  Start   End     Size    File system     Name       Flags
 1      1049kB  210MB   209MB   ext4            boot
 2      210MB   419MB   210MB   ext4            boot-uefi
 3      419MB   27.3GB  26.8GB  ext4            usr
 4      27.3GB  49.8GB  22.5GB  ext4            home
 5      49.8GB  55.2GB  5369MB  ext4            opt
 6      55.2GB  58.4GB  3221MB  ext4            tmp
 7      58.4GB  90.6GB  32.2GB  ext4            usr-src
 8      90.6GB  112GB   21.5GB  ext4            root
 9      112GB   115GB   2732MB  linux-swap(v1)  swap

(parted) rm 1
(parted) mkpart bios_boot 2048s 2M
(parted) mkpart boot 2M 210M
(parted) set 1 bios_grub on
(parted) exit
(lfs chroot) root:/sources/linux-6.7.4# grub-install /dev/sdd
Installing for i386-pc platform.
Installation finished. No error reported.
```
Create filesystem for boot partition
```bash
bash-5.2# mkfs.ext4 /dev/disk/by-partlabel/boot
mke2fs 1.46.5 (30-Dec-2021)
Creating filesystem with 202752 1k blocks and 50600 inodes
Filesystem UUID: db8e75bc-8bf1-459e-b3f5-72e68de3ed8f
Superblock backups stored on blocks:
        8193, 24577, 40961, 57345, 73729

Allocating group tables: done
Writing inode tables: done
Creating journal (4096 blocks): done
Writing superblocks and filesystem accounting information: done

bash-5.2# mv /mnt/lfs/boot /mnt/lfs/boot2
bash-5.2# mv /mnt/lfs/boot2/* /mnt/lfs/boot
bash-5.2# ls /mnt/lfs/boot2/
bash-5.2# rm -rf /mnt/lfs/boot2
bash-5.2#
```
Continue 
```bash
(lfs chroot) root:/sources/linux-6.7.4#
(lfs chroot) root:/sources/linux-6.7.4# cat > /boot/grub/grub.cfg << "EOF"
> # Begin /boot/grub/grub.cfg
> set default=0
> set timeout=5
> insmod part_gpt
> insmod ext2
> #set root=(hd0,2)
> search --set=root --fs-uuid 0c9e71ea-32d4-4337-b3b4-2457b9d27272
> set root=(hd0,2)
> menuentry "GNU/Linux, Linux 6.7.4-lfs-12.1" {
>         #linux   /vmlinuz-6.7.4-lfs-12.1 root=/dev/sda2 ro
>         linux   /vmlinuz-6.7.4-lfs-12.1 root=PARTUUID=c2f2887c-d09f-4f10-9e6c-68dae5ed99c2 ro
> }
> EOF
(lfs chroot) root:/sources/linux-6.7.4#
```
## 11 The End
```bash
(lfs chroot) root:/sources/linux-6.7.4# echo 12.1 > /etc/lfs-release
(lfs chroot) root:/sources/linux-6.7.4# export EDITOR=vim
(lfs chroot) root:/sources/linux-6.7.4#
cat > /etc/lsb-release << "EOF"
DISTRIB_ID="Linux From Scratch"
DISTRIB_RELEASE="12.1"
DISTRIB_CODENAME="zhihao"
DISTRIB_DESCRIPTION="Linux From Scratch"
EOF
(lfs chroot) root:/sources/linux-6.7.4#
cat > /etc/os-release << "EOF"
NAME="Linux From Scratch"
VERSION="12.1"
ID=lfs
PRETTY_NAME="Linux From Scratch 12.1"
VERSION_CODENAME="zhihao"
HOME_URL="https://www.linuxfromscratch.org/lfs/"
EOF
(lfs chroot) root:/sources/linux-6.7.4# logout
bash-5.2# umount -v $LFS/dev/pts
umount: /mnt/lfs/dev/pts unmounted
bash-5.2# mountpoint -q $LFS/dev/shm && umount -v $LFS/dev/shm
umount: /mnt/lfs/dev/shm unmounted
bash-5.2# umount -v $LFS/dev
umount: /mnt/lfs/dev unmounted
bash-5.2# umount -v $LFS/run
umount: /mnt/lfs/run unmounted
bash-5.2# umount -v $LFS/proc
umount: /mnt/lfs/proc unmounted
bash-5.2# umount -v $LFS/sys
umount: /mnt/lfs/sys unmounted
bash-5.2# umount -R /mnt/lfs/
```
There is kernel panic after boots, I think the reason is /usr is not mounted when boot, I merge / to /usr
```bash
bash-5.2# mount /dev/sdd8 /mnt/lfs
bash-5.2# mkdir /mnt/usr
bash-5.2# mount /dev/sdd3 /mnt/usr
bash-5.2#
bash-5.2# ls /mnt/lfs/usr
bash-5.2# cp -a /mnt/lfs/usr /mnt/usr/
bash-5.2# mv -v /mnt/usr/* /mnt/usr/usr/
renamed '/mnt/usr/bin' -> '/mnt/usr/usr/bin'
renamed '/mnt/usr/include' -> '/mnt/usr/usr/include'
renamed '/mnt/usr/lib' -> '/mnt/usr/usr/lib'
renamed '/mnt/usr/libexec' -> '/mnt/usr/usr/libexec'
renamed '/mnt/usr/local' -> '/mnt/usr/usr/local'
renamed '/mnt/usr/lost+found' -> '/mnt/usr/usr/lost+found'
renamed '/mnt/usr/sbin' -> '/mnt/usr/usr/sbin'
renamed '/mnt/usr/share' -> '/mnt/usr/usr/share'
renamed '/mnt/usr/src' -> '/mnt/usr/usr/src'
mv: cannot move '/mnt/usr/usr' to a subdirectory of itself, '/mnt/usr/usr/usr'
bash-5.2# ls /mnt/usr/usr/
bin  include  lib  libexec  local  lost+found  sbin  share  src
bash-5.2# 
bash-5.2# cp -a /mnt/lfs/. /mnt/usr/.
```
Update fstab
```bash
bash-5.2# cat /mnt/lfs/etc/fstab
# Begin /etc/fstab
# file system  mount-point    type     options             dump  fsck
#                                                                order
#/dev/disk/by-partlabel/root / ext4   defaults      1     1
/dev/disk/by-partlabel/boot /boot ext4   defaults      1     1
/dev/disk/by-partlabel/boot-uefi /boot/efi ext4   defaults      1     1
#/dev/disk/by-partlabel/usr /usr ext4   defaults      1     1
/dev/disk/by-partlabel/usr / ext4   defaults      1     1
/dev/disk/by-partlabel/home /home ext4   defaults      1     1
/dev/disk/by-partlabel/opt /opt ext4   defaults      1     1
/dev/disk/by-partlabel/tmp /tmp ext4   defaults      1     1
/dev/disk/by-partlabel/usr-src /usr/src ext4   defaults      1     1
/dev/disk/by-partlabel/swap  swap                    swap   pri=1                      0  0

proc           /proc          proc     nosuid,noexec,nodev 0     0
sysfs          /sys           sysfs    nosuid,noexec,nodev 0     0
devpts         /dev/pts       devpts   gid=5,mode=620      0     0
tmpfs          /run           tmpfs    defaults            0     0
devtmpfs       /dev           devtmpfs mode=0755,nosuid    0     0
tmpfs          /dev/shm       tmpfs    nosuid,nodev        0     0
cgroup2        /sys/fs/cgroup cgroup2  nosuid,noexec,nodev 0     0
# End /etc/fstab
bash-5.2# 
```
After boot, I can see the login prompt

The final VM image is in D:\documents\box_vms\suse\suse\{9a9650c5-ba71-4f5d-b0ee-588decbc3fde}.vdi

