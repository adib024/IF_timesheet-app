'use client'

import { useState, useEffect, useCallback } from 'react'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isWeekend, isBefore, startOfDay } from 'date-fns'

interface LeaveDay {
    id: string
    date: string
    type: string
}

export default function LeavePage() {
    const [leaveDays, setLeaveDays] = useState<LeaveDay[]>([])
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [isLoading, setIsLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showRemoveModal, setShowRemoveModal] = useState(false)
    const [leaveToRemove, setLeaveToRemove] = useState<LeaveDay | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [leaveType, setLeaveType] = useState('SICK')

    const fetchLeaveDays = useCallback(async () => {
        const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
        const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

        try {
            const res = await fetch(`/api/leave?startDate=${startDate}&endDate=${endDate}`)
            const json = await res.json()
            setLeaveDays(json.data || [])
        } catch (error) {
            console.error('Failed to fetch leave days:', error)
        } finally {
            setIsLoading(false)
        }
    }, [currentMonth])

    useEffect(() => {
        fetchLeaveDays()
    }, [fetchLeaveDays])

    const getLeaveForDate = (date: Date): LeaveDay | undefined => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return leaveDays.find(l => {
            const leaveDate = l.date.split('T')[0]
            return leaveDate === dateStr
        })
    }

    const handleDateClick = (date: Date) => {
        const existingLeave = getLeaveForDate(date)

        if (existingLeave) {
            // Already a leave day - do nothing on click (use the list to remove)
            return
        }

        // Only allow future dates or today
        if (isBefore(startOfDay(date), startOfDay(new Date()))) {
            return
        }

        setSelectedDate(date)
        setShowConfirmModal(true)
    }

    const handleConfirmLeave = async () => {
        if (!selectedDate) return

        setIsSubmitting(true)
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const res = await fetch('/api/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr, type: leaveType }),
            })

            if (res.ok) {
                await fetchLeaveDays()
                setShowConfirmModal(false)
                setSelectedDate(null)
            } else {
                const err = await res.json()
                alert(`Failed to add leave: ${err.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Error adding leave:', error)
            alert('An unexpected error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRemoveClick = (leave: LeaveDay) => {
        setLeaveToRemove(leave)
        setShowRemoveModal(true)
    }

    const handleConfirmRemove = async () => {
        if (!leaveToRemove) return

        setIsSubmitting(true)
        try {
            const dateStr = leaveToRemove.date.split('T')[0]
            await fetch(`/api/leave?date=${dateStr}`, { method: 'DELETE' })
            await fetchLeaveDays()
            setShowRemoveModal(false)
            setLeaveToRemove(null)
        } catch (error) {
            console.error('Error removing leave:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    })

    // Get leaves for current month for the list
    const currentMonthLeaves = leaveDays.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div>
            <div className="p-8 space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-brand-teal uppercase tracking-wide">Leave Management</h1>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <Card className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                            >
                                ← Previous
                            </Button>
                            <h2 className="text-xl font-semibold text-gray-900">
                                {format(currentMonth, 'MMMM yyyy')}
                            </h2>
                            <Button
                                variant="ghost"
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                            >
                                Next →
                            </Button>
                        </div>

                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}

                            {days.map((day) => {
                                const isLeave = !!getLeaveForDate(day)
                                const weekend = isWeekend(day)
                                const today = isToday(day)
                                const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                                const canSelect = !isLeave && !isPast

                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => handleDateClick(day)}
                                        disabled={!canSelect}
                                        className={`
                                            relative p-3 rounded-lg text-center transition-all
                                            ${today ? 'ring-2 ring-indigo-500' : ''}
                                            ${isLeave
                                                ? 'bg-blue-100 text-blue-800 cursor-default'
                                                : isPast
                                                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                    : weekend
                                                        ? 'bg-gray-100 text-gray-400 hover:bg-blue-50 cursor-pointer'
                                                        : 'hover:bg-blue-50 text-gray-700 cursor-pointer'
                                            }
                                        `}
                                        title={
                                            isLeave ? 'Leave marked (remove from list below)'
                                                : isPast ? 'Cannot mark past dates'
                                                    : 'Click to request leave'
                                        }
                                    >
                                        <span className={`text-sm ${today ? 'font-bold' : ''}`}>
                                            {format(day, 'd')}
                                        </span>
                                        {isLeave && (
                                            <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600">
                                                L
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500 text-center">
                            Click on a future date to request leave
                        </div>
                    </Card>

                    {/* Leave List */}
                    <Card>
                        <h3 className="font-semibold text-gray-900 mb-4">Marked Leave Days</h3>

                        {currentMonthLeaves.length === 0 ? (
                            <p className="text-gray-400 text-sm">No leave days this month</p>
                        ) : (
                            <div className="space-y-2">
                                {currentMonthLeaves.map((leave) => (
                                    <div
                                        key={leave.id}
                                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                                    >
                                        <div className="flex flex-col items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">
                                                    {format(new Date(leave.date), 'EEE, MMM d')}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500 capitalize">{leave.type.toLowerCase()}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveClick(leave)}
                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Remove leave"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                        <div className="text-2xl text-blue-500 font-bold">i</div>
                        <div>
                            <h4 className="font-medium text-blue-900">How Leave Days Work</h4>
                            <ul className="text-sm text-blue-700 mt-2 space-y-1">
                                <li>• Click a <strong>future date</strong> on the calendar to request leave</li>
                                <li>• Confirm your leave in the popup</li>
                                <li>• To remove leave, use the 🗑️ button in the list on the right</li>
                                <li>• Leave days pause reminder emails</li>
                            </ul>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Confirm Add Leave Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false)
                    setSelectedDate(null)
                }}
                title="Confirm Leave"
            >
                <div className="text-center">
                    <p className="text-gray-700 mb-2">
                        Mark leave for:
                    </p>
                    <p className="text-xl font-semibold text-gray-900 mb-6">
                        {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </p>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Leave Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setLeaveType('SICK')}
                                className={`p-2 rounded border text-sm font-medium transition-colors ${leaveType === 'SICK'
                                    ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                Sick
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeaveType('OTHER')}
                                className={`p-2 rounded border text-sm font-medium transition-colors ${leaveType === 'OTHER'
                                    ? 'bg-gray-50 border-gray-500 text-gray-700 ring-1 ring-gray-500'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                Other
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowConfirmModal(false)
                                setSelectedDate(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleConfirmLeave}
                            isLoading={isSubmitting}
                        >
                            Confirm Leave
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Remove Leave Modal */}
            <Modal
                isOpen={showRemoveModal}
                onClose={() => {
                    setShowRemoveModal(false)
                    setLeaveToRemove(null)
                }}
                title="Remove Leave"
            >
                <div className="text-center">
                    <p className="text-gray-700 mb-2">
                        Remove leave for:
                    </p>
                    <p className="text-xl font-semibold text-gray-900 mb-6">
                        {leaveToRemove && format(new Date(leaveToRemove.date), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                                setShowRemoveModal(false)
                                setLeaveToRemove(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-1"
                            onClick={handleConfirmRemove}
                            isLoading={isSubmitting}
                        >
                            Remove Leave
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
