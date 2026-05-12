<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsV2Seeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'manage_users',
            'add_students',
            'edit_students',
            'view_students',
            'manage_classes',
            'view_classes',
            'manage_attendance',
            'manage_absence_requests',
            'view_attendance',
            'manage_journals',
            'view_journals',
            'manage_milestone_definitions',
            'update_student_milestones',
            'view_milestones',
            'manage_hafalan_definitions',
            'update_student_hafalan',
            'view_hafalan',
            'manage_portfolios',
            'view_portfolios',
            'manage_galleries',
            'view_galleries',
            'manage_reports',
            'publish_reports',
            'view_reports',
            'manage_announcements',
            'view_announcements',
            'manage_agendas',
            'view_agendas',
            'manage_registrations',
            'view_registrations',
            'manage_articles',
            'view_articles',
            'manage_fees',
            'view_fees',
            'view_analytics',
            'manage_ai_chat',
            'view_ai_chat_history',
            'use_ai_chat',
            'view_dashboard',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        Role::findOrCreate('super_admin', 'web')->syncPermissions(Permission::all());

        Role::findOrCreate('kepala_sekolah', 'web')->syncPermissions([
            'view_dashboard', 'view_analytics',
            'view_ai_chat_history',
            'view_students',
            'view_classes',
            'view_attendance', 'manage_absence_requests',
            'view_journals',
            'view_milestones',
            'view_hafalan',
            'view_portfolios',
            'view_galleries',
            'manage_reports', 'publish_reports', 'view_reports',
            'manage_announcements', 'view_announcements',
            'manage_agendas', 'view_agendas',
            'view_registrations',
            'view_articles', 'manage_articles',
            'view_fees',
            'use_ai_chat',
        ]);

        Role::findOrCreate('admin', 'web')->syncPermissions([
            'view_dashboard', 'view_analytics',
            'view_ai_chat_history', 'use_ai_chat',
            'add_students', 'edit_students', 'view_students',
            'manage_classes', 'view_classes',
            'manage_attendance', 'manage_absence_requests', 'view_attendance',
            'manage_journals', 'view_journals',
            'manage_milestone_definitions', 'update_student_milestones', 'view_milestones',
            'manage_hafalan_definitions', 'update_student_hafalan', 'view_hafalan',
            'manage_portfolios', 'view_portfolios',
            'manage_galleries', 'view_galleries',
            'manage_reports', 'publish_reports', 'view_reports',
            'manage_announcements', 'view_announcements',
            'manage_agendas', 'view_agendas',
            'manage_registrations', 'view_registrations',
            'manage_articles', 'view_articles',
            'manage_fees', 'view_fees',
        ]);

        Role::findOrCreate('guru', 'web')->syncPermissions([
            'view_dashboard',
            'view_students',
            'view_classes',
            'manage_attendance', 'manage_absence_requests', 'view_attendance',
            'manage_journals', 'view_journals',
            'update_student_milestones', 'view_milestones',
            'update_student_hafalan', 'view_hafalan',
            'manage_portfolios', 'view_portfolios',
            'manage_galleries', 'view_galleries',
        ]);

        Role::findOrCreate('orang_tua', 'web')->syncPermissions([
            'view_journals',
            'view_milestones',
            'view_hafalan',
            'view_portfolios',
            'view_galleries',
            'view_reports',
            'view_announcements',
            'view_agendas',
            'view_attendance',
            'view_articles',
            'view_fees',
            'use_ai_chat',
        ]);
    }
}
