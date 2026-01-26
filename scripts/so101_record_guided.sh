#!/bin/bash
set -euo pipefail

DATASET_ROOT="${DATASET_ROOT:-$HOME/Desktop/Multiverse/assets/motions/so101_home_poseA_home_v1}"
DURATION_SEC="${DURATION_SEC:-20}"
MANUAL="${MANUAL:-0}"

if [ -d "$DATASET_ROOT" ]; then
  echo "❌ Dataset folder already exists: $DATASET_ROOT"
  echo "   Remove it or set DATASET_ROOT to a new folder."
  exit 1
fi

echo "✅ Using DATASET_ROOT=$DATASET_ROOT"
echo ""
export HF_LEROBOT_CALIBRATION="$HOME/.cache/huggingface/lerobot/calibration"

if [ "$MANUAL" = "1" ]; then
  echo "Recording with manual prompts (may interrupt clean shutdown)."
  echo "Sequence:"
  echo "  1) Home pose -> press ENTER"
  echo "  2) Pose A -> press ENTER"
  echo "  3) Back to Home -> press ENTER to stop"
else
  echo "Recording with a fixed window: ${DURATION_SEC}s"
  echo "Do: home → poseA → home within the window."
fi
echo ""

if [ "$MANUAL" = "1" ]; then
  lerobot-record \
    --robot.type=so101_follower --robot.id=follower_arm \
    --robot.port=/dev/serial/by-id/usb-1a86_USB_Single_Serial_5AE6082421-if00 \
    --teleop.type=so101_leader --teleop.id=leader_arm \
    --teleop.port=/dev/serial/by-id/usb-1a86_USB_Single_Serial_5AE6084391-if00 \
    --dataset.root="$DATASET_ROOT" \
    --dataset.fps=30 \
    --dataset.episode_time_s="$DURATION_SEC" \
    --dataset.reset_time_s=1 \
    --dataset.num_episodes=1 \
    --dataset.video=false \
    --dataset.repo_id="local/so101_home_poseA_home_v1" \
    --dataset.single_task=true \
    --dataset.push_to_hub=false \
    --robot.cameras='{"teleop":{"type":"opencv","index_or_path":"/dev/robot_cam","width":1920,"height":1080,"fps":30,"fourcc":"MJPG"}}' \
    &
  REC_PID=$!
  read -r -p "HOME pose ready? Press ENTER to continue... "
  read -r -p "POSE A ready? Press ENTER to continue... "
  read -r -p "BACK TO HOME ready? Press ENTER to stop recording... "

  echo "Stopping recording..."
  kill -INT "$REC_PID" || true
  wait "$REC_PID" || true
else
  lerobot-record \
    --robot.type=so101_follower --robot.id=follower_arm \
    --robot.port=/dev/serial/by-id/usb-1a86_USB_Single_Serial_5AE6082421-if00 \
    --teleop.type=so101_leader --teleop.id=leader_arm \
    --teleop.port=/dev/serial/by-id/usb-1a86_USB_Single_Serial_5AE6084391-if00 \
    --dataset.root="$DATASET_ROOT" \
    --dataset.fps=30 \
    --dataset.episode_time_s="$DURATION_SEC" \
    --dataset.reset_time_s=1 \
    --dataset.num_episodes=1 \
    --dataset.video=false \
    --dataset.repo_id="local/so101_home_poseA_home_v1" \
    --dataset.single_task=true \
    --dataset.push_to_hub=false \
    --robot.cameras='{"teleop":{"type":"opencv","index_or_path":"/dev/robot_cam","width":1920,"height":1080,"fps":30,"fourcc":"MJPG"}}'
fi

echo ""
echo "✅ Recording finished. Dataset should be in:"
echo "   $DATASET_ROOT"

