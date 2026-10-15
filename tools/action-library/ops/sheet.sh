#!/bin/zsh
# sheet.sh <out.jpg> <id> [id...]  : stack comparison + mistake panel per id
out=$1; shift; args=(); f=""; n=0
for id in "$@"; do d=/Volumes/Developer/Projects/steady/build/action-library/$id; args+=(-i $d/comparison.jpg -i $d/svg-mistakes.png); f+="[$((2*n))]crop=1600:700:0:90,scale=1000:-2[c$n];[$((2*n+1))]crop=800:440:0:180,scale=-2:438[m$n];[c$n][m$n]hstack[r$n];"; n=$((n+1)); done
v=""; for ((i=0;i<n;i++)); do v+="[r$i]"; done
if (( n == 1 )); then
  ffmpeg -v error -y $args -filter_complex "${f%?}" -map "[r0]" $out
else
  ffmpeg -v error -y $args -filter_complex "${f}${v}vstack=$n" $out
fi
