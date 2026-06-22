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

  getTimelineSteps: (bookingStatus, queueStatus, currentStage) => {
    const steps = [
      { id: 'CheckIn', name: 'Check-in' },
      { id: 'ExteriorWash', name: 'Rửa ngoại thất' },
      { id: 'InteriorCleaning', name: 'Vệ sinh nội thất' },
      { id: 'FinalInspection', name: 'Kiểm tra cuối' },
      { id: 'Completed', name: 'Hoàn tất' }
    ];

    let activeIndex = -1;
    
    if (bookingStatus === 'Completed' || queueStatus === 'Completed' || queueStatus === 'Archived' || currentStage === 'Completed') {
      activeIndex = 5;
    } else if (queueStatus === 'Waiting' || queueStatus === 'LPR_Scan' || bookingStatus === 'CheckedIn' || currentStage) {
      const stage = currentStage || 'CheckIn';
      if (stage === 'CheckIn') {
        activeIndex = 0;
      } else if (stage === 'ExteriorWash' || stage === 'Exterior') {
        activeIndex = 1;
      } else if (stage === 'InteriorCleaning' || stage === 'Interior') {
        activeIndex = 2;
      } else if (stage === 'FinalInspection') {
        activeIndex = 3;
      }
    }

    return steps.map((step, idx) => {
      const isCompleted = activeIndex !== -1 && idx < activeIndex;
      const isActive = activeIndex !== -1 && idx === activeIndex;
      return {
        name: step.name,
        isCompleted,
        isActive
      };
    });
  }
};
