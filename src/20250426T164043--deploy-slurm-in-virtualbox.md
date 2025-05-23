---
title:      "accelerate the molecular docking process with slurm"
date:       2025-04-26T16:40:43+08:00
tags:       []
identifier: "20250426T164043"
layout: "layouts/post.njk"
eleventyNavigation:
  key: "accelerate the molecular docking process with slurm"
  parent: Home
---

## 概览

尝试将一个分子对接流程并行化
``` bash
zhihao@dust|/home/zhihao/Downloads/mol-docking/Test|$ ls
2w17.pdb  conf.txt  pro.pdb  receptor.pdbqt  testset200.sdf  vina.sh
zhihao@dust|/home/zhihao/Downloads/mol-docking/Test|$
```

集群搭建使用 virtualbox, 镜像为 Rocky-8.10-x86_64-dvd1.iso。共构建 3 节点，包含一个控制节点（ 主机名 slurm-controller ），两个计算节点（ 主机名 slurm-compute[1,2] ），配置均为 4 cpu, 3G mem, 50G ssd。slurm database 服务部署在控制节点上。集群使用 /mnt/slurm_shared/ nfs 共享文件夹。

## ansible 自动部署 slurm 集群

集群安装ansible

``` bash
zhihao@slurm-controller|/home/zhihao/.ssh|$ sudo yum install ansible -y
[sudo] password for zhihao:
Last metadata expiration check: 1:15:45 ago on Sat 26 Apr 2025 04:30:06 AM EDT.
Dependencies resolved.
=================================================================================================================================
 Package                                 Architecture           Version                          Repository                 Size
=================================================================================================================================
Installing:
 ansible                                 noarch                 9.2.0-1.el8                      epel                       46 M
Installing dependencies:
 ansible-core                            x86_64                 2.16.3-2.el8                     appstream                 3.6 M
 git-core                                x86_64                 2.43.5-2.el8_10                  appstream                  11 M
 mpdecimal                               x86_64                 2.5.1-3.el8                      appstream                  92 k
 python3.12                              x86_64                 3.12.8-1.el8_10                  appstream                  29 k
 python3.12-cffi                         x86_64                 1.16.0-2.el8                     appstream                 298 k
 python3.12-cryptography                 x86_64                 41.0.7-1.el8                     appstream                 1.2 M
 python3.12-libs                         x86_64                 3.12.8-1.el8_10                  appstream                  10 M
 python3.12-pip-wheel                    noarch                 23.2.1-4.el8                     appstream                 1.5 M
 python3.12-ply                          noarch                 3.11-2.el8                       appstream                 133 k
 python3.12-pycparser                    noarch                 2.20-2.el8                       appstream                 144 k
 python3.12-pyyaml                       x86_64                 6.0.1-2.el8                      appstream                 202 k
 sshpass                                 x86_64                 1.09-4.el8                       appstream                  29 k
Installing weak dependencies:
 python3-jmespath                        noarch                 0.9.0-11.el8                     appstream                  44 k

Transaction Summary
=================================================================================================================================
Install  14 Packages

Total download size: 75 M
Installed size: 560 M
Downloading Packages:
...
zhihao@slurm-controller|/home/zhihao/.ssh|$ ssh -t slurm-compute1 sudo yum install ansible -y
...
zhihao@slurm-controller|/home/zhihao/.ssh|$ ssh -t slurm-compute2 sudo yum install ansible -y
...
```

创建 ansible 目录，创建主机清单
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads|$ mkdir -p slurm-cluster
zhihao@slurm-controller|/home/zhihao/Downloads|$ cd slurm-cluster/
/home/zhihao/Downloads/slurm-cluster
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ cat inventory.ini
[slurm_controllers]
slurm-controller ansible_host=192.168.1.100

[slurm_database]
slurm-controller ansible_host=192.168.1.100

[slurm_compute_nodes]
slurm-compute1 ansible_host=192.168.1.101
slurm-compute2 ansible_host=192.168.1.102

[slurm:children]
slurm_controllers
slurm_compute_nodes

[all:vars]
ansible_user=root
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$
```

创建集群 playbook
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ cat slurm-cluster.yml
- name: configure common roles
  hosts: slurm
  become: yes
  roles:
    - common
- name: configure slurm controller
  hosts: slurm_controllers
  become: yes
  roles:
    - slurm-controller
- name: configure slurm compute nodes
  hosts: slurm_compute_nodes
  become: yes
  roles:
    - slurm-compute-node
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$
```

创建角色目录
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ mkdir -p roles/common/{tasks,templates}
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ mkdir -p roles/slurm-controller/{tasks,templates}
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ mkdir -p roles/slurm-compute-node/{tasks,templates}
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$
```

编写 common 角色，添加 epel、powertools 仓库，创建 slurm 用户

``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ cat roles/common/tasks/main.yml
- name: install epel repository
  dnf:
    name: epel-release
    state: present
- name: enable powertools repository
  ansible.builtin.command: >
    dnf config-manager --set-enabled powertools
- name: create slurm group
  group:
    name: "slurm"
    gid: "1001"
- name: create slurm user
  user:
    name: "slurm"
    uid: "1001"
    group: "slurm"
    shell: /bin/false
    home: /nonexistent
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$
```

编写 slurm-controller 角色
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ cat roles/slurm-controller/tasks/main.yml
- name: install slurm packages
  dnf:
    name:
      - slurm
      - slurm-slurmd
      - slurm-slurmdbd
      - slurm-slurmctld
      - mariadb
      - mariadb-server
      - python3-mysqlclient
      - munge
    state: present

- name: change owner and group of slurm dirs
  file:
    path: "{% raw %}{{ item }}{% endraw %}"
    owner: slurm
    group: slurm
    recurse: yes
  loop:
    - /var/log/slurm
    - /var/spool/slurm/d
    - /var/spool/slurm/ctld

- name: generate munge key
  command: create-munge-key
  args:
    creates: /etc/munge/munge.key

- name: start and enable services
  systemd:
    name: "{% raw %}{{ item }}{% endraw %}"
    state: started
    enabled: yes
  loop:
    - munge
    - mariadb

- name: create slurm accounting database
  mysql_db:
    name: "slurm_acct_db"
    state: present
  become: true

- name: create slurm database user and grant privileges
  mysql_user:
    name: "slurm"
    password: "123456"
    priv: "slurm_acct_db.*:ALL"
    host: "slurm-controller"
    state: present
  become: true

- name: configure slurmdbd.conf
  template:
    src: slurmdbd.conf.j2
    dest: /etc/slurm/slurmdbd.conf
    owner: slurm
    group: slurm
    mode: '0600'
    backup: yes

- name: start and enable slurmdbd service
  systemd:
    name: slurmdbd
    state: restarted
    enabled: yes
  become: true

- name: configure slurm
  template:
    src: slurm.conf.j2
    dest: /etc/slurm/slurm.conf
    owner: slurm
    group: slurm
    mode: '0644'
    backup: yes

- name: start and enable slurmdbd service
  systemd:
    name: slurmctld
    state: restarted
    enabled: yes
  become: true

- name: configure firewall
  firewalld:
    port: "{% raw %}{{ item }}{% endraw %}"
    state: enabled
    permanent: yes
    immediate: yes
  loop:
    - 6817/tcp
    - 32768-60999/tcp
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$
```

编写 slurm-compute-node 角色

``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ cat roles/slurm-compute-node/tasks/main.yml
- name: copy munge key from slurm-controller
  become: yes
  synchronize:
    src: /etc/munge/munge.key
    dest: /etc/munge/munge.key
  delegate_to: slurm-controller

- name: install slurm packages
  dnf:
    name:
      - slurm
      - slurm-slurmd
      - munge
    state: present
- name: copy slurm from slurm controller
  synchronize:
    src: /etc/slurm/slurm.conf
    dest: /etc/slurm/slurm.conf
  delegate_to: slurm-controller
- name: start and enable services
  systemd:
    name: "{% raw %}{{ item }}{% endraw %}"
    state: restarted
    enabled: yes
  loop:
    - slurmd
    - munge

- name: change owner and group of slurm dirs
  file:
    path: "{% raw %}{{ item }}{% endraw %}"
    owner: slurm
    group: slurm
    recurse: yes
  loop:
    - /var/log/slurm
    - /var/spool/slurm/d
    - /var/spool/slurm/ctld

- name: configure firewall
  firewalld:
    port: "{% raw %}{{ item }}{% endraw %}"
    state: enabled
    permanent: yes
    immediate: yes
  loop:
    - 6818/tcp
    - 32768-60999/tcp
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$
```

创建 slurm controller 模板
``` bash
[zhihao@slurm-controller slurm-cluster]$ cat roles/slurm-controller/templates/slurm.conf.j2 
ControlMachine={% raw %}{{ inventory_hostname }}{% endraw %}
AuthType=auth/munge
CryptoType=crypto/munge
MpiDefault=pmix
ProctrackType=proctrack/cgroup
ReturnToService=1
SlurmctldPidFile=/var/run/slurm/slurmctld.pid
SlurmctldPort=6817
SlurmdPidFile=/var/run/slurm/slurmd.pid
SlurmdPort=6818
SlurmdSpoolDir=/var/spool/slurm/d
SlurmUser=slurm
StateSaveLocation=/var/spool/slurm/ctld
SwitchType=switch/none
TaskPlugin=task/none
InactiveLimit=0
KillWait=30
MinJobAge=300
SlurmctldTimeout=120
SlurmdTimeout=300
Waittime=0
SchedulerType=sched/backfill
SelectType=select/cons_res
SelectTypeParameters=CR_CPU

AccountingStorageEnforce=limits
AccountingStorageHost={% raw %}{{ inventory_hostname }}{% endraw %}
AccountingStorageType=accounting_storage/slurmdbd
AccountingStorageUser=slurm
AccountingStoreJobComment=YES

ClusterName=rocky_cluster
JobCompType=jobcomp/none
JobAcctGatherFrequency=30
JobAcctGatherType=jobacct_gather/none
SlurmctldDebug=3
SlurmctldLogFile=/var/log/slurm/slurmctld.log
SlurmdDebug=3
SlurmdLogFile=/var/log/slurm/slurmd.log

# Nodes Configuration
NodeName=slurm-compute1 CPUs=4 Boards=1 SocketsPerBoard=1 CoresPerSocket=4 ThreadsPerCore=1 RealMemory=2786
NodeName=slurm-compute2 CPUs=4 Boards=1 SocketsPerBoard=1 CoresPerSocket=4 ThreadsPerCore=1 RealMemory=2786
PartitionName=debug Nodes=slurm-compute[1-2] Default=YES MaxTime=INFINITE State=UP

[zhihao@slurm-controller slurm-cluster]$ 
```

创建 slurm database 模板
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ cat roles/slurm-controller/templates/slurmdbd.conf.j2
AuthType=auth/munge
DebugLevel=4
DbdHost={% raw %}{{ inventory_hostname }}{% endraw %}
LogFile=/var/log/slurm/slurmdbd.log
PidFile=/var/run/slurm/slurmdbd.pid
PurgeEventAfter=1month
PurgeJobAfter=1month
PurgeResvAfter=1month
PurgeStepAfter=1month
PurgeSuspendAfter=1month
PurgeTXNAfter=1month
PurgeUsageAfter=1month
SlurmUser=slurm
StorageType=accounting_storage/mysql
StorageHost={% raw %}{{ inventory_hostname }}{% endraw %}
StoragePass=123456
StorageUser=slurm
StorageLoc=slurm_acct_db
Parameters=PreserveCaseUser
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$
```

运行 slurm playbook
``` bash
[root@slurm-controller slurm-cluster]# ansible-playbook -i inventory.ini slurm-cluster.yml

PLAY [configure common roles] ********************************************************

TASK [Gathering Facts] ***************************************************************
ok: [slurm-compute1]
ok: [slurm-compute2]
ok: [slurm-controller]

TASK [common : install epel repository] **********************************************
ok: [slurm-controller]
ok: [slurm-compute2]
ok: [slurm-compute1]

TASK [common : enable powertools repository] *****************************************
changed: [slurm-compute1]
changed: [slurm-controller]
changed: [slurm-compute2]

TASK [common : create slurm group] ***************************************************
ok: [slurm-compute1]
ok: [slurm-controller]
ok: [slurm-compute2]

TASK [common : create slurm user] ****************************************************
ok: [slurm-compute1]
ok: [slurm-controller]
ok: [slurm-compute2]

PLAY [configure slurm controller] ****************************************************

TASK [Gathering Facts] ***************************************************************
ok: [slurm-controller]

TASK [slurm-controller : install slurm packages] *************************************
ok: [slurm-controller]

TASK [slurm-controller : change owner and group of slurm dirs] ***********************
ok: [slurm-controller] => (item=/var/log/slurm)
ok: [slurm-controller] => (item=/var/spool/slurm/d)
ok: [slurm-controller] => (item=/var/spool/slurm/ctld)

TASK [slurm-controller : generate munge key] *****************************************
ok: [slurm-controller]

TASK [slurm-controller : start and enable services] **********************************
ok: [slurm-controller] => (item=munge)
ok: [slurm-controller] => (item=mariadb)

TASK [slurm-controller : create slurm accounting database] ***************************
ok: [slurm-controller]

TASK [slurm-controller : create slurm database user and grant privileges] ************
[WARNING]: Option column_case_sensitive is not provided. The default is now false, so
the column's name will be uppercased. The default will be changed to true in
community.mysql 4.0.0.
ok: [slurm-controller]

TASK [slurm-controller : configure slurmdbd.conf] ************************************
ok: [slurm-controller]

TASK [slurm-controller : start and enable slurmdbd service] **************************
changed: [slurm-controller]

TASK [slurm-controller : configure slurm] ********************************************
ok: [slurm-controller]

TASK [slurm-controller : start and enable slurmdbd service] **************************
changed: [slurm-controller]

TASK [slurm-controller : configure firewall] *****************************************
ok: [slurm-controller] => (item=6817/tcp)
ok: [slurm-controller] => (item=32768-60999/tcp)

PLAY [configure slurm compute nodes] *************************************************

TASK [Gathering Facts] ***************************************************************
ok: [slurm-compute1]
ok: [slurm-compute2]

TASK [slurm-compute-node : copy munge key from slurm-controller] *********************
ok: [slurm-compute1 -> slurm-controller(192.168.1.100)]
ok: [slurm-compute2 -> slurm-controller(192.168.1.100)]

TASK [slurm-compute-node : install slurm packages] ***********************************
ok: [slurm-compute1]
ok: [slurm-compute2]

TASK [slurm-compute-node : copy slurm from slurm controller] *************************
ok: [slurm-compute1 -> slurm-controller(192.168.1.100)]
ok: [slurm-compute2 -> slurm-controller(192.168.1.100)]

TASK [slurm-compute-node : start and enable services] ********************************
changed: [slurm-compute1] => (item=slurmd)
changed: [slurm-compute2] => (item=slurmd)
changed: [slurm-compute1] => (item=munge)
changed: [slurm-compute2] => (item=munge)

TASK [slurm-compute-node : change owner and group of slurm dirs] *********************
ok: [slurm-compute1] => (item=/var/log/slurm)
ok: [slurm-compute2] => (item=/var/log/slurm)
changed: [slurm-compute1] => (item=/var/spool/slurm/d)
changed: [slurm-compute2] => (item=/var/spool/slurm/d)
ok: [slurm-compute1] => (item=/var/spool/slurm/ctld)
ok: [slurm-compute2] => (item=/var/spool/slurm/ctld)

TASK [slurm-compute-node : configure firewall] ***************************************
ok: [slurm-compute1] => (item=6818/tcp)
ok: [slurm-compute2] => (item=6818/tcp)
ok: [slurm-compute1] => (item=32768-60999/tcp)
ok: [slurm-compute2] => (item=32768-60999/tcp)

PLAY RECAP ***************************************************************************
slurm-compute1             : ok=12   changed=3    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
slurm-compute2             : ok=12   changed=3    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0
slurm-controller           : ok=17   changed=3    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0

[root@slurm-controller slurm-cluster]#
```

检查集群状态

``` bash
[root@slurm-controller slurm-cluster]# sinfo
PARTITION AVAIL  TIMELIMIT  NODES  STATE NODELIST
debug*       up   infinite      2   idle slurm-compute[1-2]
[root@slurm-controller slurm-cluster]# sacct
       JobID    JobName  Partition    Account  AllocCPUS      State ExitCode
------------ ---------- ---------- ---------- ---------- ---------- --------
[root@slurm-controller slurm-cluster]# squeue
             JOBID PARTITION     NAME     USER ST       TIME  NODES NODELIST(REASON)
[root@slurm-controller slurm-cluster]#
[root@slurm-controller log]# srun sleep 8
[root@slurm-controller slurm-cluster]# squeue
             JOBID PARTITION     NAME     USER ST       TIME  NODES NODELIST(REASON)
                44     debug    sleep     root  R       0:03      1 slurm-compute1
[root@slurm-controller slurm-cluster]# squeue
             JOBID PARTITION     NAME     USER ST       TIME  NODES NODELIST(REASON)
[root@slurm-controller slurm-cluster]#
```

添加zhihao为管理员
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ sudo sacctmgr add account name=zhihao
 Adding Account(s)
  zhihao
 Settings
  Description     = Account Name
  Organization    = Parent/Account Name
 Associations
  A = zhihao     C = rocky_clus
Would you like to commit changes? (You have 30 seconds to decide)
(N/y): y
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ sudo sacctmgr add user name=zhihao account=zhihao AdminLevel=Admin
 Adding User(s)
  zhihao
 Settings =
  Admin Level     = Administrator
 Associations =
  U = zhihao    A = zhihao     C = rocky_clus
 Non Default Settings
Would you like to commit changes? (You have 30 seconds to decide)
(N/y): y
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$ sacctmgr show user           User   Def Acct     Admin
---------- ---------- ---------
      root       root Administ+
    zhihao     zhihao Administ+
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-cluster|$

```

## 运行 vina demo

检查脚本内容

``` bash
[root@slurm-controller Test]# cat vina.sh
# This is the serial script
export PATH=/home/user/Programs/autodock/autodock_vina_1_1_2_linux_x86/bin/:$PATH
export PATH=/home/user/Programs/autodock/MGLTools-1.5.6/MGLToolsPckgs/AutoDockTools/Utilities24/:$PATH
if [ -d "mols" ]; then
rm -rf mols
fi
mkdir mols
prepare_receptor4.py -r pro.pdb  -e -o receptor.pdbqt ########## prepare only once
obabel -isd testset.sdf -omol2 -O testset.mol2
cd mols
obabel ../testset.mol2 -O vs.mol2 -m
for mol2 in `ls *.mol2`    ############# loop by every small molecules
do
        prepare_ligand4.py -l $mol2 -o ligand.pdbqt
        vina --config ../conf.txt --cpu 1  --out out.pdbqt --log log.txt
        obabel -ipdbqt out.pdbqt -osd -O temp.sdf
        cat temp.sdf >> output.sdf
        rm log.txt ligand.pdbqt out.pdbqt temp.sdf
done
cd ../
[root@slurm-controller Test]#
```

脚本结构为：

- 受体蛋白文件为 pdb, 转换为 pdbqt 格式供 vina 使用
- 小分子结构文件 testset.sdf 转换成 testset.mol2 格式
- testset.mol2 多分子拆分为 vs<id>.mol2 单分子文件
- 循环
    - mol2 转为 pdbqt
    - vina 对配体、受体 pdbqt 文件对接，输出 pdbqt 对接结果
    - pdbqt 对接结果转回 sdf
- 收集 sdf 结果文件    

尝试运行脚本失败
``` bash
[root@slurm-controller Test]# ./vina.sh
./vina.sh: line 8: prepare_receptor4.py: command not found
./vina.sh: line 9: obabel: command not found
./vina.sh: line 11: obabel: command not found
ls: cannot access '*.mol2': No such file or directory
[root@slurm-controller Test]#
```

下载解压 autodock_vina_1_1_2_linux_x86.tgz, mgltools_x86_64Linux2_1.5.6.tar_.gz
``` bash
[root@slurm-controller ~]# wget "https://vina.scripps.edu/wp-content/uploads/sites/55/2020/12/autodock_vina_1_1_2_linux_x86.tgz"
--2025-04-27 09:11:13--  https://vina.scripps.edu/wp-content/uploads/sites/55/2020/12/autodock_vina_1_1_2_linux_x86.tgz
Resolving vina.scripps.edu (vina.scripps.edu)... 192.26.252.19
Connecting to vina.scripps.edu (vina.scripps.edu)|192.26.252.19|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1238242 (1.2M) [application/x-gzip]
Saving to: ‘autodock_vina_1_1_2_linux_x86.tgz’

autodock_vina_1_1_2_l 100%[=======================>]   1.18M  23.4KB/s    in 51s      
2025-04-27 09:12:05 (23.7 KB/s) - ‘autodock_vina_1_1_2_linux_x86.tgz’ saved [1238242/1238242]

zhihao@slurm-controller|/home/zhihao/Downloads|$ tar -zxvf autodock_vina_1_1_2_linux_x86.tgz
autodock_vina_1_1_2_linux_x86/
autodock_vina_1_1_2_linux_x86/LICENSE
autodock_vina_1_1_2_linux_x86/bin/
autodock_vina_1_1_2_linux_x86/bin/vina
autodock_vina_1_1_2_linux_x86/bin/vina_split
zhihao@slurm-controller|/home/zhihao/Downloads|$ ls auto
autodock_vina_1_1_2_linux_x86/     autodock_vina_1_1_2_linux_x86.tgz
zhihao@slurm-controller|/home/zhihao/Downloads|$ ls autodock_vina_1_1_2_linux_x86/
bin  LICENSE
zhihao@slurm-controller|/home/zhihao/Downloads|$
zhihao@slurm-controller|/home/zhihao/Downloads|$ tar -zxf mgltools_x86_64Linux2_1.5.6.tar_.gz
zhihao@slurm-controller|/home/zhihao/Downloads|$ ls mgl
mgltools_x86_64Linux2_1.5.6/         mgltools_x86_64Linux2_1.5.6.tar_.gz*
zhihao@slurm-controller|/home/zhihao/Downloads|$ ls mgltools_x86_64Linux2_1.5.6
Data.tar.gz  LICENSES              Python2.5_x86_64Linux2.tar.gz  Tools
install.sh   MGLToolsPckgs.tar.gz  README
zhihao@slurm-controller|/home/zhihao/Downloads|$
```

安装 mgltools
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6|$ ./install.sh
...
tk8.4/safetk.tcl
tk8.4/mkpsenc.tcl
tk8.4/xmfbox.tcl
Python installed, please wait for the rest of MGLTools to be installed
Running /home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin/python Tools/install.py
Installing  MGLPackages
Installing files from MGLToolsPckgs .tar.gz
eInstalling files from Data .tar.gz
Creating the pmv, adt, vision and tester scripts
current directory: /home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6
setting PYTHONHOME environment
Traceback (most recent call last):
  File "/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/MGLToolsPckgs/mglutil/splashregister/license.py", line 7, in <module>
    tk_root = Tkinter.Tk()
  File "/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/lib/python2.5/lib-tk/Tkinter.py", line 1647, in __init__
    self.tk = _tkinter.create(screenName, baseName, className, interactive, wantobjects, useTk, sync, use)
_tkinter.TclError: couldn't connect to display ":0"

 MGLTools installation complete.
To run pmv, adt, vision or pythonsh scripts located at:
/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin
you will need to do ONE of the following:

-- add the /home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin to the path environment variable in .cshrc or .bashrc:
.cshrc:
set path = (/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin $path)

.bashrc
export PATH=/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin:$PATH

-- create aliases in your .cshrc or .bashrc
.cshrc:
alias pmv /home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin/pmv
alias adt /home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin/adt
alias vision /home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin/vision
alias pythonsh /home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin/pythonsh

.bashrc
alias pmv='/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin/pmv'
alias adt='/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin/adt'
alias vision='/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin/vision'
alias pythonsh='/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin/pythonsh'

-- source ./initMGLtools.sh (bash) or ./initMGLtools.csh (c-shell)

Please have a look at README file for more information about
licenses, tutorials, documentations and mailing lists for the different
packages enclosed in this distribution
If you have any problems please visit our FAQ page (http://mgltools.scripps.edu/documentation/faq).

zhihao@slurm-controller|/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6|$ 
```

更新 vina.sh 环境变量
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$ head -3 vina.sh
# This is the serial script
export PATH=/home/zhihao/Downloads/autodock_vina_1_1_2_linux_x86/bin:$PATH
export PATH=/home/zhihao/Downloads/mgltools_x86_64Linux2_1.5.6/bin:$PATH
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$
```

安装 openbabel-3.1.1-18.el8.x86_64

``` bash
zhihao@slurm-controller|/home/zhihao/Downloads|$ sudo dnf install openbabel
...
```

环境基本准备好，再次运行报错
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$ ./vina.sh
'Deleting non-standard residues:AACE0_AACT1299_AI191300_ from pro
==============================
*** Open Babel Error  in OpenAndSetFormat
  Cannot open testset.sdf
0 molecules converted
/home/zhihao/Downloads/slurm-lab/Test/mols
0 molecules converted
ls: cannot access '*.mol2': No such file or directory
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$
```

重命名 testset200.sdf 为 testset.sdf 后 vina.sh 可运行

``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$ ./vina.sh
'Deleting non-standard residues:AACE0_AACT1299_AI191300_ from pro
201 molecules converted
/home/zhihao/Downloads/slurm-lab/Test/mols
201 molecules converted
201 files output. The first is vs1.mol2
#################################################################
# If you used AutoDock Vina in your work, please cite:          #
#                                                               #
# O. Trott, A. J. Olson,                                        #
# AutoDock Vina: improving the speed and accuracy of docking    #
# with a new scoring function, efficient optimization and       #
# multithreading, Journal of Computational Chemistry 31 (2010)  #
# 455-461                                                       #
#                                                               #
# DOI 10.1002/jcc.21334                                         #
#                                                               #
# Please see http://vina.scripps.edu for more information.      #
#################################################################

Reading input ... done.
Setting up the scoring function ... done.
Analyzing the binding site ... done.
Using random seed: 1931149362
Performing search ...
0%   10   20   30   40   50   60   70   80   90   100%
|----|----|----|----|----|----|----|----|----|----|
***************************************************
done.
Refining results ... done.

mode |   affinity | dist from best mode
     | (kcal/mol) | rmsd l.b.| rmsd u.b.
-----+------------+----------+----------
   1         -9.1      0.000      0.000
   2         -8.1      3.635      8.475
   3         -8.0      5.082      7.895
   4         -8.0      5.733      8.730
   5         -8.0      8.292     11.400
   6         -8.0      3.347      7.427
   7         -7.9      5.242      9.106
   8         -7.9      5.712      8.642
   9         -7.8      3.966      5.124
  10         -7.7      5.592      8.513
Writing output ... done.
10 molecules converted
#################################################################
# If you used AutoDock Vina in your work, please cite:          #
#                                                               #
# O. Trott, A. J. Olson,                                        #
# AutoDock Vina: improving the speed and accuracy of docking    #
# with a new scoring function, efficient optimization and       #
# multithreading, Journal of Computational Chemistry 31 (2010)  #
# 455-461                                                       #
#                                                               #
# DOI 10.1002/jcc.21334                                         #
#                                                               #
# Please see http://vina.scripps.edu for more information.      #
#################################################################

Reading input ... done.
Setting up the scoring function ... done.
Analyzing the binding site ... done.
Using random seed: -29891784
Performing search ...
0%   10   20   30   40   50   60   70   80   90   100%
|----|----|----|----|----|----|----|----|----|----|
***************************************************
done.
Refining results ... done.

mode |   affinity | dist from best mode
     | (kcal/mol) | rmsd l.b.| rmsd u.b.
-----+------------+----------+----------
   1        -10.9      0.000      0.000
   2        -10.9      0.026      1.961
   3        -10.2      5.412      8.221
   4        -10.2      5.414      8.148
   5         -9.9      1.571      3.055
   6         -9.8      4.895      8.583
   7         -9.7      5.319      8.305
   8         -9.6      4.863      6.782
   9         -9.4      1.866      8.184
  10         -8.9      4.055      5.777
Writing output ... done.
10 molecules converted
#################################################################
# If you used AutoDock Vina in your work, please cite:          #
#                                                               #
# O. Trott, A. J. Olson,                                        #
# AutoDock Vina: improving the speed and accuracy of docking    #
# with a new scoring function, efficient optimization and       #
# multithreading, Journal of Computational Chemistry 31 (2010)  #
# 455-461                                                       #
#                                                               #
# DOI 10.1002/jcc.21334                                         #
#                                                               #
# Please see http://vina.scripps.edu for more information.      #
#################################################################

Reading input ... done.
Setting up the scoring function ... done.
Analyzing the binding site ... done.
Using random seed: -1740369596
Performing search ...
0%   10   20   30   40   50   60   70   80   90   100%
|----|----|----|----|----|----|----|----|----|----|
***************************************************
done.
Refining results ... done.

mode |   affinity | dist from best mode
     | (kcal/mol) | rmsd l.b.| rmsd u.b.
-----+------------+----------+----------
   1         -7.7      0.000      0.000
   2         -7.3      2.941      8.248
   3         -7.3      2.000      7.731
   4         -7.2      2.511      5.326
   5         -7.0      2.891      5.561
   6         -7.0      2.057      7.131
   7         -6.8      3.090      8.148
   8         -6.8      4.068      7.826
   9         -6.7      1.553      2.107
  10         -6.7      2.871      6.717
Writing output ... done.
10 molecules converted
#################################################################
# If you used AutoDock Vina in your work, please cite:          #
#                                                               #
# O. Trott, A. J. Olson,                                        #
# AutoDock Vina: improving the speed and accuracy of docking    #
# with a new scoring function, efficient optimization and       #
# multithreading, Journal of Computational Chemistry 31 (2010)  #
# 455-461                                                       #
#                                                               #
# DOI 10.1002/jcc.21334                                         #
#                                                               #
# Please see http://vina.scripps.edu for more information.      #
#################################################################

Reading input ... done.
Setting up the scoring function ... done.
Analyzing the binding site ... done.
Using random seed: -832291788
Performing search ...
0%   10   20   30   40   50   60   70   80   90   100%
|----|----|----|----|----|----|----|----|----|----|
***************************************************
done.
Refining results ... done.

mode |   affinity | dist from best mode
     | (kcal/mol) | rmsd l.b.| rmsd u.b.
-----+------------+----------+----------
   1         -7.8      0.000      0.000
   2         -7.5      2.556      5.568
   3         -7.2      3.261      7.045
   4         -7.1      1.552      3.516
   5         -7.1      3.531      8.237
   6         -7.1      3.034      7.416
   7         -7.1      3.005      5.912
   8         -7.1      2.290      5.425
   9         -7.0      2.334      7.098
  10         -6.8      2.803      5.541
Writing output ... done.
10 molecules converted
#################################################################
# If you used AutoDock Vina in your work, please cite:          #
#                                                               #
# O. Trott, A. J. Olson,                                        #
# AutoDock Vina: improving the speed and accuracy of docking    #
# with a new scoring function, efficient optimization and       #
# multithreading, Journal of Computational Chemistry 31 (2010)  #
# 455-461                                                       #
#                                                               #
# DOI 10.1002/jcc.21334                                         #
#                                                               #
# Please see http://vina.scripps.edu for more information.      #
#################################################################

Reading input ... done.
Setting up the scoring function ... done.
Analyzing the binding site ... done.
Using random seed: -1005170334
Performing search ...
0%   10   20   30   40   50   60   70   80   90   100%
|----|----|----|----|----|----|----|----|----|----|
***************************************************
done.
Refining results ... done.

mode |   affinity | dist from best mode
     | (kcal/mol) | rmsd l.b.| rmsd u.b.
-----+------------+----------+----------
   1         -8.4      0.000      0.000
   2         -8.4      8.694     13.384
   3         -8.3      2.793      4.213
   4         -8.0      8.455     13.245
   5         -7.9      2.876     12.058
   6         -7.7      2.990     12.238
   7         -7.7      9.146     13.795
   8         -7.7     10.056     14.591
   9         -7.5      8.024     12.610
  10         -7.5      7.944      9.897
Writing output ... done.
10 molecules converted
#################################################################
# If you used AutoDock Vina in your work, please cite:          #
#                                                               #
# O. Trott, A. J. Olson,                                        #
# AutoDock Vina: improving the speed and accuracy of docking    #
# with a new scoring function, efficient optimization and       #
# multithreading, Journal of Computational Chemistry 31 (2010)  #
# 455-461                                                       #
#                                                               #
# DOI 10.1002/jcc.21334                                         #
#                                                               #
# Please see http://vina.scripps.edu for more information.      #
#################################################################

Reading input ... done.
Setting up the scoring function ... done.
Analyzing the binding site ... done.
Using random seed: 1161529493
Performing search ...
0%   10   20   30   40   50   60   70   80   90   100%
|----|----|----|----|----|----|----|----|----|----|
*******************????????
```

观察进程负载，vina 仅使用一个核
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/autodock_vina_1_1_2_linux_x86/bin|$ pidstat 1
Linux 4.18.0-553.el8_10.x86_64 (slurm-controller)       04/27/2025      _x86_64_     (4 CPU)

10:30:57 AM   UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
10:30:58 AM  1000    245427   91.18    0.00    0.00    0.00   91.18     3  vina
10:30:58 AM  1000    245523    0.00    0.98    0.00    0.00    0.98     1  pidstat

10:30:58 AM   UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
10:30:59 AM  1000    245427   92.08    0.00    0.00    0.00   92.08     3  vina

10:30:59 AM   UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
10:31:00 AM  1000    245427   91.00    0.00    0.00    0.00   91.00     3  vina
10:31:00 AM  1000    245523    0.00    1.00    0.00    0.00    1.00     1  pidstat
^C

Average:      UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
Average:     1000    245427   91.42    0.00    0.00    0.00   91.42     -  vina
Average:     1000    245523    0.00    0.66    0.00    0.00    0.66     -  pidstat
zhihao@slurm-controller|/home/zhihao/Downloads/autodock_vina_1_1_2_linux_x86/bin|$

```

修改 vina --cpu 参数为 3，重新运行 vina.sh
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$ ./vina.sh
...
Writing output ... done.
10 molecules converted
#################################################################
# If you used AutoDock Vina in your work, please cite:          #
#                                                               #
# O. Trott, A. J. Olson,                                        #
# AutoDock Vina: improving the speed and accuracy of docking    #
# with a new scoring function, efficient optimization and       #
# multithreading, Journal of Computational Chemistry 31 (2010)  #
# 455-461                                                       #
#                                                               #
# DOI 10.1002/jcc.21334                                         #
#                                                               #
# Please see http://vina.scripps.edu for more information.      #
#################################################################

Reading input ... done.
Setting up the scoring function ... done.
Analyzing the binding site ... done.
Using random seed: 1922223658
Performing search ...
0%   10   20   30   40   50   60   70   80   90   100%
|----|----|----|----|----|----|----|----|----|----|
***************************************************
done.
Refining results ... done.

mode |   affinity | dist from best mode
     | (kcal/mol) | rmsd l.b.| rmsd u.b.
-----+------------+----------+----------
   1        -10.3      0.000      0.000
   2        -10.2      5.951      9.637
   3         -9.8      3.881      9.708
   4         -9.6      2.802      3.936
   5         -9.5      5.175      7.909
   6         -9.5      6.486     10.253
   7         -9.5      3.979      9.961
   8         -9.4      4.542      8.731
   9         -9.4      4.472      6.863
  10         -9.4      3.443      5.373
Writing output ... done.
==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

==============================
*** Open Babel Warning  in PerceiveBondOrders
  Failed to kekulize aromatic bonds in OBMol::PerceiveBondOrders (title is out.pdbqt)

10 molecules converted
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$
```

output.sdf 输出看起来正常
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test/mols|$ grep -c out.pdbqt output.sdf
1990
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test/mols|$ ls *.mol2 | wc -l
201
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$ ls mols/
output.sdf  vs126.mol2  vs152.mol2  vs179.mol2  vs22.mol2  vs49.mol2  vs75.mol2
vs100.mol2  vs127.mol2  vs153.mol2  vs17.mol2   vs23.mol2  vs4.mol2   vs76.mol2
vs101.mol2  vs128.mol2  vs154.mol2  vs180.mol2  vs24.mol2  vs50.mol2  vs77.mol2
vs102.mol2  vs129.mol2  vs155.mol2  vs181.mol2  vs25.mol2  vs51.mol2  vs78.mol2
vs103.mol2  vs12.mol2   vs156.mol2  vs182.mol2  vs26.mol2  vs52.mol2  vs79.mol2
vs104.mol2  vs130.mol2  vs157.mol2  vs183.mol2  vs27.mol2  vs53.mol2  vs7.mol2
vs105.mol2  vs131.mol2  vs158.mol2  vs184.mol2  vs28.mol2  vs54.mol2  vs80.mol2
vs106.mol2  vs132.mol2  vs159.mol2  vs185.mol2  vs29.mol2  vs55.mol2  vs81.mol2
vs107.mol2  vs133.mol2  vs15.mol2   vs186.mol2  vs2.mol2   vs56.mol2  vs82.mol2
vs108.mol2  vs134.mol2  vs160.mol2  vs187.mol2  vs30.mol2  vs57.mol2  vs83.mol2
vs109.mol2  vs135.mol2  vs161.mol2  vs188.mol2  vs31.mol2  vs58.mol2  vs84.mol2
vs10.mol2   vs136.mol2  vs162.mol2  vs189.mol2  vs32.mol2  vs59.mol2  vs85.mol2
vs110.mol2  vs137.mol2  vs163.mol2  vs18.mol2   vs33.mol2  vs5.mol2   vs86.mol2
vs111.mol2  vs138.mol2  vs164.mol2  vs190.mol2  vs34.mol2  vs60.mol2  vs87.mol2
vs112.mol2  vs139.mol2  vs165.mol2  vs191.mol2  vs35.mol2  vs61.mol2  vs88.mol2
vs113.mol2  vs13.mol2   vs166.mol2  vs192.mol2  vs36.mol2  vs62.mol2  vs89.mol2
vs114.mol2  vs140.mol2  vs167.mol2  vs193.mol2  vs37.mol2  vs63.mol2  vs8.mol2
vs115.mol2  vs141.mol2  vs168.mol2  vs194.mol2  vs38.mol2  vs64.mol2  vs90.mol2
vs116.mol2  vs142.mol2  vs169.mol2  vs195.mol2  vs39.mol2  vs65.mol2  vs91.mol2
vs117.mol2  vs143.mol2  vs16.mol2   vs196.mol2  vs3.mol2   vs66.mol2  vs92.mol2
vs118.mol2  vs144.mol2  vs170.mol2  vs197.mol2  vs40.mol2  vs67.mol2  vs93.mol2
vs119.mol2  vs145.mol2  vs171.mol2  vs198.mol2  vs41.mol2  vs68.mol2  vs94.mol2
vs11.mol2   vs146.mol2  vs172.mol2  vs199.mol2  vs42.mol2  vs69.mol2  vs95.mol2
vs120.mol2  vs147.mol2  vs173.mol2  vs19.mol2   vs43.mol2  vs6.mol2   vs96.mol2
vs121.mol2  vs148.mol2  vs174.mol2  vs1.mol2    vs44.mol2  vs70.mol2  vs97.mol2
vs122.mol2  vs149.mol2  vs175.mol2  vs200.mol2  vs45.mol2  vs71.mol2  vs98.mol2
vs123.mol2  vs14.mol2   vs176.mol2  vs201.mol2  vs46.mol2  vs72.mol2  vs99.mol2
vs124.mol2  vs150.mol2  vs177.mol2  vs20.mol2   vs47.mol2  vs73.mol2  vs9.mol2
vs125.mol2  vs151.mol2  vs178.mol2  vs21.mol2   vs48.mol2  vs74.mol2
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$ ls
2w17.pdb  mols     receptor.pdbqt  testset.sdf  vina-slurm.sh
conf.txt  pro.pdb  testset.mol2    vina.sh
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test|$
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test/mols|$ stat output.sdf
  File: output.sdf
  Size: 7159169         Blocks: 13984      IO Block: 4096   regular file
Device: fd00h/64768d    Inode: 38064062    Links: 1
Access: (0664/-rw-rw-r--)  Uid: ( 1000/  zhihao)   Gid: ( 1000/  zhihao)
Context: unconfined_u:object_r:user_home_t:s0
Access: 2025-04-27 20:59:31.902990351 -0400
Modify: 2025-04-27 13:12:11.517281587 -0400
Change: 2025-04-27 13:12:11.517281587 -0400
 Birth: 2025-04-27 10:59:01.029139138 -0400
zhihao@slurm-controller|/home/zhihao/Downloads/slurm-lab/Test/mols|$
```

## vina.sh 脚本并行化

分析知 for 循环内过程为分子匹配过程，相互独立，可以改为并行逻辑

移动 vina 项目到 /mnt/slurm_shared/ 共享文件夹
``` bash
zhihao@slurm-controller|/home/zhihao/Downloads|$ rsync -auv slurm-lab /mnt/slurm_shared/
sending incremental file list
slurm-lab/
slurm-lab/Test/
slurm-lab/Test/2w17.pdb
slurm-lab/Test/conf.txt
slurm-lab/Test/pro.pdb
slurm-lab/Test/receptor.pdbqt
slurm-lab/Test/testset.sdf
slurm-lab/Test/vina-slurm.sh
slurm-lab/Test/vina.sh

sent 1,881,539 bytes  received 161 bytes  3,763,400.00 bytes/sec
total size is 1,880,537  speedup is 1.00
zhihao@slurm-controller|/home/zhihao/Downloads|$
zhihao@slurm-controller|/home/zhihao/Downloads|$ mv autodock_vina_1_1_2_linux_x86 mgltools_x86_64Linux2_1.5.6 /mnt/slurm_shared/
zhihao@slurm-controller|/home/zhihao/Downloads|$
```

vina.sh 改写为三个脚本，vina-start.sh, vina-mol.sh, vina-post.sh，其中 vina-mol.sh 可并行化。

vina-start.sh
``` bash
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$ cat vina-start.sh
#!/bin/bash
#SBATCH --job-name=vina_docking
#SBATCH --output=logs/vina_start_%j.out
#SBATCH --error=logs/vina_start_%j.err
set -e

export PATH=/mnt/slurm_shared/autodock_vina_1_1_2_linux_x86/bin:$PATH
export PATH=/mnt/slurm_shared/mgltools_x86_64Linux2_1.5.6//bin:$PATH
export PATH=/mnt/slurm_shared/mgltools_x86_64Linux2_1.5.6//MGLToolsPckgs/AutoDockTools/Utilities24:$PATH

if [ -d "mols" ]; then
    rm -rf mols
fi
mkdir mols
prepare_receptor4.py -r pro.pdb  -e -o receptor.pdbqt ########## prepare only once
obabel -isd testset.sdf -omol2 -O testset.mol2
cd mols
obabel ../testset.mol2 -O vs.mol2 -m

jobid=$(sbatch --parsable /mnt/slurm_shared/slurm-lab/Test/vina-mol.sh )

sbatch --dependency=afterok:$jobid ../vina-post.sh
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$
```

vina-mol.sh
``` bash
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$ cat vina-mol.sh
#!/bin/bash
#SBATCH --array=1-201
#SBATCH --output=../logs/vina_mol_%j.out
#SBATCH --error=../logs/vina_mol_%j.err

#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --ntasks-per-node=1

echo "Slurm Array Task ID: $SLURM_ARRAY_TASK_ID"

export PATH=/mnt/slurm_shared/autodock_vina_1_1_2_linux_x86/bin:$PATH
export PATH=/mnt/slurm_shared/mgltools_x86_64Linux2_1.5.6//bin:$PATH
export PATH=/mnt/slurm_shared/mgltools_x86_64Linux2_1.5.6//MGLToolsPckgs/AutoDockTools/Utilities24:$PATH

task_id=$SLURM_ARRAY_TASK_ID
mol2_num=$(ls vs*.mol2 | wc -l)

echo "now in $(pwd)"

if [[ $task_id -gt 0 && $task_id -le $mol2_num ]]; then
        prepare_ligand4.py -l vs${task_id}.mol2 -o ligand${task_id}.pdbqt
        srun vina --config ../conf.txt --cpu 1 --ligand ligand${task_id}.pdbqt --out out${task_id}.pdbqt --log log.txt
        obabel -ipdbqt out${task_id}.pdbqt -osd -O temp${task_id}.sdf
        rm -f log.txt ligand${task_id}.pdbqt out${task_id}.pdbqt
else
  echo "SLURM_ARRAY_TASK_ID ($SLURM_ARRAY_TASK_ID) is out of range."
fi
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$
```

vina-post.sh
``` bash
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$ cat vina-post.sh
#!/bin/bash
echo "now in $(pwd)"
cat temp*.sdf > output.sdf
cd ..
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$
```

sbatch 提交 vina-start.sh，双节点八核都在工作。 检查 tempxx.sdf 正常生成，结束后会产生 output.sdf 结果文件，测试结束。
``` bash
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$ sbatch vina-start.sh
Submitted batch job 11419
[root@slurm-controller slurm-cluster]# squeue
             JOBID PARTITION     NAME     USER ST       TIME  NODES NODELIST(REASON)
    11420_[86-201]     debug vina-mol   zhihao PD       0:00      1 (Resources)
             11421     debug vina-pos   zhihao PD       0:00      1 (Dependency)
          11420_85     debug vina-mol   zhihao  R       0:01      1 slurm-compute2
          11420_84     debug vina-mol   zhihao  R       0:35      1 slurm-compute1
          11420_83     debug vina-mol   zhihao  R       0:38      1 slurm-compute1
          11420_82     debug vina-mol   zhihao  R       0:40      1 slurm-compute1
          11420_81     debug vina-mol   zhihao  R       0:46      1 slurm-compute1
          11420_79     debug vina-mol   zhihao  R       1:57      1 slurm-compute2
          11420_78     debug vina-mol   zhihao  R       2:09      1 slurm-compute2
          11420_77     debug vina-mol   zhihao  R       2:23      1 slurm-compute2
[root@slurm-controller slurm-cluster]#
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test/mols|$ ls temp*
temp10.sdf  temp22.sdf  temp34.sdf  temp46.sdf  temp58.sdf  temp6.sdf   temp81.sdf
temp11.sdf  temp23.sdf  temp35.sdf  temp47.sdf  temp59.sdf  temp70.sdf  temp85.sdf
temp12.sdf  temp24.sdf  temp36.sdf  temp48.sdf  temp5.sdf   temp71.sdf  temp86.sdf
temp13.sdf  temp25.sdf  temp37.sdf  temp49.sdf  temp60.sdf  temp72.sdf  temp87.sdf
temp14.sdf  temp26.sdf  temp38.sdf  temp4.sdf   temp61.sdf  temp73.sdf  temp88.sdf
temp15.sdf  temp27.sdf  temp39.sdf  temp50.sdf  temp62.sdf  temp74.sdf  temp89.sdf
temp16.sdf  temp28.sdf  temp3.sdf   temp51.sdf  temp63.sdf  temp75.sdf  temp8.sdf
temp17.sdf  temp29.sdf  temp40.sdf  temp52.sdf  temp64.sdf  temp76.sdf  temp90.sdf
temp18.sdf  temp2.sdf   temp41.sdf  temp53.sdf  temp65.sdf  temp77.sdf  temp91.sdf
temp19.sdf  temp30.sdf  temp42.sdf  temp54.sdf  temp66.sdf  temp78.sdf  temp92.sdf
temp1.sdf   temp31.sdf  temp43.sdf  temp55.sdf  temp67.sdf  temp79.sdf  temp9.sdf
temp20.sdf  temp32.sdf  temp44.sdf  temp56.sdf  temp68.sdf  temp7.sdf
temp21.sdf  temp33.sdf  temp45.sdf  temp57.sdf  temp69.sdf  temp80.sdf
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test/mols|$
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test/mols|$ head temp7.sdf
out7.pdbqt
 OpenBabel04282512433D

 28 29  0  0  1  0  0  0  0  0999 V2000
    4.0900   27.5220    6.3970 C   0  0  2  0  0  3  0  0  0  0  0  0
    5.1170   26.8390    7.3330 C   0  0  2  0  0  3  0  0  0  0  0  0
    5.5320   25.4610    6.7550 C   0  0  2  0  0  3  0  0  0  0  0  0
    4.6310   27.6260    5.1030 O   0  0  0  0  0  0  0  0  0  0  0  0
    5.9580   25.5860    5.2770 C   0  0  1  0  0  3  0  0  0  0  0  0
    4.8790   26.3600    4.4770 C   0  0  2  0  0  3  0  0  0  0  0  0
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test/mols|$
```

output.sdf 已生成
``` bash
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test/mols|$ du -sh output.sdf
6.9M    output.sdf
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test/mols|$ grep pdbqt output.sdf | uniq -c | wc -l
199
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test/mols|$ head output.sdf
out100.pdbqt
 OpenBabel04282513053D

 31 32  0  0  0  0  0  0  0  0999 V2000
    1.5130   23.3700   12.3830 C   0  0  0  0  0  2  0  0  0  0  0  0
    1.0140   24.2610   11.2350 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.4640   25.4400   11.5890 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.3830   25.7230   12.5560 H   0  0  0  0  0  0  0  0  0  0  0  0
    1.1200   23.8700   10.0690 O   0  0  0  0  0  0  0  0  0  0  0  0
   -0.0180   26.3120   10.6830 N   0  0  0  0  0  2  0  0  0  0  0  0
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test/mols|$
```

## 千万分子对接架构思考

将大分子文件拆分为较小的分子文件，存储到分布式存储，slurm 计算集群主节点运行 slurm 控制器和数据库，计算节点运行 slurmd 服务，配置自动伸缩组动态扩展资源。计算结果写入分布式存储。

## 问题排查

### srun 运行超时  
 
排查后为 firewalld 导致，分析思路为：

tcpdump 看 slurm-controller 节点拒绝 35683 端口连接
``` bash
[root@slurm-controller log]# tcpdump -n -i enp0s8 not port 22 -c 40 |& less
...
05:21:59.758261 IP 192.168.1.101.50952 > 192.168.1.100.35683: Flags [S], seq 352325565
6, win 29200, options [mss 1460,sackOK,TS val 2648148599 ecr 0,nop,wscale 7], length 0
05:21:59.758282 IP 192.168.1.100 > 192.168.1.101: ICMP host 192.168.1.100 unreachable
- admin prohibited filter, length 68
```
端口 35683 为 srun 进程
``` bash
[root@slurm-controller slurm-cluster]# netstat -nap | grep srun
tcp        0      0 0.0.0.0:38217           0.0.0.0:*               LISTEN      202777/srun
tcp        0      0 0.0.0.0:33805           0.0.0.0:*               LISTEN      202777/srun
tcp        0      0 0.0.0.0:34135           0.0.0.0:*               LISTEN      202777/srun
tcp        0      0 0.0.0.0:45913           0.0.0.0:*               LISTEN      202777/srun
tcp        0      0 0.0.0.0:35683           0.0.0.0:*               LISTEN      202777/srun
[root@slurm-controller slurm-cluster]#
```

firewalld-cmd 启用日志
``` bash
[root@slurm-controller log]#  firewall-cmd --set-log-denied=all
Warning: ALREADY_SET: all
success
[root@slurm-controller log]# sudo firewall-cmd --get-active-zones
public
  interfaces: enp0s8 enp0s3
[root@slurm-controller log]#
```

dmesg -Tw 验证端口被 firewalld drop
``` bash
[Sun Apr 27 05:21:54 2025] FINAL_REJECT: IN=enp0s8 OUT= MAC=08:00:27:d5:e1:eb:08:00:27:22:8a:d0:08:00 SRC=192.168.1.101 DST=192.168.1.100 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=44477 DF PROTO=TCP SPT=50952 DPT=35683 WINDOW=29200 RES=0x00 SYN URGP=0
[Sun Apr 27 05:21:55 2025] FINAL_REJECT: IN=enp0s8 OUT= MAC=08:00:27:d5:e1:eb:08:00:27:22:8a:d0:08:00 SRC=192.168.1.101 DST=192.168.1.100 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=62684 DF PROTO=TCP SPT=50968 DPT=35683 WINDOW=29200 RES=0x00 SYN URGP=0
```
ansible 内允许32768-60999/tcp 高端口通过后解决

### srun -o 参数位置问题

-o 参数位置写在执行文件后面会导致没有重定向输出且无报错

复现
``` bash
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$ sbatch /mnt/slurm_shared/test.sh -o ./alog
Submitted batch job 11140
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$ echo $?
0
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$ ls ./alog
ls: cannot access './alog': No such file or directory
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$ sbatch -o ./alog /mnt/slurm_shared/test.sh
Submitted batch job 11142
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$ ls ./alog
./alog
zhihao@slurm-controller|/mnt/slurm_shared/slurm-lab/Test|$
```

因为 -o 参数被认为是执行文件的参数了，逻辑上也合理，注意即可

### sbatch 输出重定向问题

问题为 sbatch 提交脚本后无法运行且无任何输出，squeue 内任务显示状态PD，NODELIST 为 none  
  
无输出导致排查困难，只能注释文本内容测试。排查后发现因为脚本内标准输入输出重定向路径写错，logs 文件夹不存在，创建文件夹后正常运行。
``` bash
#SBATCH --output=logs/vina_mol_%j.out
#SBATCH --error=logs/vina_mol_%j.err
```
