export const queueStatusMapper = {
  getLabel: (status, addons = []) => {
    const addonNames = Array.isArray(addons) ? addons : [];
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'Chờ check-in';
      case 'LPR_Scan':
      case 'LprScanned':
        return 'Đã quét LPR';
      case 'Washing':
      case 'FoamWashing':
        return 'Đang rửa bọt tuyết';
      case 'Addon_Processing':
      case 'AddonProcessing':
        if (addonNames.length === 0) {
          return 'Đang xử lý dịch vụ đi kèm';
        }
        if (addonNames.length === 1) {
          return `${addonNames[0]} đang thực hiện`;
        }
        return `Đang xử lý ${addonNames.length} dịch vụ đi kèm`;
      case 'Drying':
        return 'Đang sấy khô';
      case 'Completed':
      case 'Archived':
        return 'Hoàn tất';
      default:
        return 'Chờ check-in';
    }
  },

  getBadgeClass: (status) => {
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'bg-secondary bg-opacity-10 text-secondary';
      case 'LPR_Scan':
      case 'LprScanned':
        return 'bg-info bg-opacity-10 text-cyan';
      case 'Washing':
      case 'FoamWashing':
      case 'Addon_Processing':
      case 'AddonProcessing':
      case 'Drying':
        return 'bg-primary bg-opacity-10 text-primary';
      case 'Completed':
      case 'Archived':
        return 'bg-success bg-opacity-10 text-success';
      default:
        return 'bg-secondary bg-opacity-10 text-muted';
    }
  },

  getIcon: (status) => {
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'fa-clock';
      case 'LPR_Scan':
      case 'LprScanned':
        return 'fa-qrcode';
      case 'Washing':
      case 'FoamWashing':
        return 'fa-soap';
      case 'Addon_Processing':
      case 'AddonProcessing':
        return 'fa-plus-circle';
      case 'Drying':
        return 'fa-wind';
      case 'Completed':
      case 'Archived':
        return 'fa-check-circle';
      default:
        return 'fa-hourglass-start';
    }
  },

  getTimelineSteps: (bookingStatus, queueStatus, addons = []) => {
    const addonNames = Array.isArray(addons) ? addons : [];
    const hasQueue = !!queueStatus;

    const steps = [
      { id: 'lpr', name: 'Nhận diện LPR' },
      { id: 'washing', name: 'Rửa bọt tuyết' }
    ];

    if (addonNames.length > 0) {
      const addonLabel = addonNames.length === 1 ? addonNames[0] : 'Dịch vụ đi kèm';
      steps.push({ id: 'addon', name: addonLabel });
    }

    steps.push({ id: 'drying', name: 'Sấy khô / Kiểm tra' });
    steps.push({ id: 'completed', name: 'Hoàn tất' });

    // Determine current active index based on queueStatus
    let activeIndex = -1; // Default to all pending (not in wash process yet)
    
    if (bookingStatus === 'Completed' || queueStatus === 'Completed' || queueStatus === 'Archived') {
      activeIndex = steps.length; // All completed
    } else if (hasQueue) {
      const status = queueStatus.toLowerCase();
      if (status === 'waiting' || status === 'waitingcheckin') {
        activeIndex = -1; // WaitingCheckin: all steps remain pending, progress 0/N
      } else if (status === 'lpr_scan' || status === 'lprscanned') {
        activeIndex = 0; // Nhận diện LPR becomes active
      } else if (status === 'washing' || status === 'foamwashing') {
        activeIndex = 1; // Rửa bọt tuyết becomes active
      } else if (status === 'addon_processing' || status === 'addonprocessing') {
        if (addonNames.length > 0) {
          activeIndex = 2; // Addon processing becomes active
        } else {
          activeIndex = 2; // Fallback to Drying if no addon
        }
      } else if (status === 'drying') {
        activeIndex = addonNames.length > 0 ? 3 : 2; // Drying becomes active
      }
    }

    return steps.map((step, idx) => {
      const isCompleted = bookingStatus === 'Completed' || queueStatus === 'Completed' || (activeIndex !== -1 && idx < activeIndex);
      const isActive = bookingStatus !== 'Completed' && queueStatus !== 'Completed' && activeIndex !== -1 && idx === activeIndex;
      return {
        name: step.name,
        isCompleted,
        isActive
      };
    });
  }
};
