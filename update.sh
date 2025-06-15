#!/bin/bash

echo "Updating claudevoice..."
echo "This will copy the updated claudevoice to /usr/local/bin/"
echo ""
sudo cp claudevoice /usr/local/bin/claudevoice
echo "✓ Update complete!"
echo ""
echo "The fix prevents 'Update Todos' and similar tool messages from being spoken."