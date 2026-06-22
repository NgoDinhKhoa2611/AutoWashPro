export const queueStatusMapper = {
  getLabel: (status, addons = []) => {
    switch (status) {
      case 'Waiting':
      case 'WaitingCheckIn':
        return 'Chờ check-in';
      case 'LPR_Scan':
      case 'LprScanned':
        return 'Đã quét LPR';
      case 'Washing':
      case 'FoamWashing':
        return 'Đang rửa xe';
      case 'Drying':
        return 'Đang sấy khô';
      case 'Completed':
        return 'Hoàn tất';
      case 'Archived':
        return 'Đã giao xe';
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
      case 'Drying':
        return 'bg-primary bg-opacity-10 text-primary';
      case 'Completed':
        return 'bg-success bg-opacity-10 text-success';
      case 'Archived':
        return 'bg-success bg-opacity-15 text-success fw-bold';
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
      case 'Drying':
        return 'fa-wind';
      case 'Completed':
        return 'fa-check-circle';
      case 'Archived':
        return 'fa-car-side';
      default:
        return 'fa-hourglass-start';
    }
  },

  getTimelineSteps: (bookingStatus, queueStatus, currentStage) => {
    const steps = [
      { id: 'CheckIn', name: 'Check-in' },
      { id: 'Washing', name: 'Rửa xe' },
      { id: 'Drying', name: 'Sấy khô' },
      { id: 'FinalInspection', name: 'Kiểm tra cuối' },
      { id: 'Completed', name: 'Hoàn tất' },
      { id: 'Checkout', name: 'Đã giao xe' }
    ];

    let activeIndex = -1;
    
    if (bookingStatus === 'Checkout' || queueStatus === 'Archived' || currentStage === 'Checkout') {
      activeIndex = 6;
    } else if (bookingStatus === 'Completed' || queueStatus === 'Completed' || currentStage === 'Completed') {
      activeIndex = 5;
    } else if (queueStatus === 'Waiting' || queueStatus === 'LPR_Scan' || bookingStatus === 'CheckedIn' || currentStage) {
      const stage = currentStage || 'CheckIn';
      if (stage === 'CheckIn') {
        activeIndex = 0;
      } else if (stage === 'Washing') {
        activeIndex = 1;
      } else if (stage === 'Drying') {
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
